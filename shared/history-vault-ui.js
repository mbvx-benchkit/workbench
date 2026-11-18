/** Accessible, CSS-class-based controls for the DOCUMENT BUILDER history vault. */
const DELETE_PHRASE = '履歴を削除';
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function makeDialog(title, description, dangerous = false, purpose = '') {
  const dialog = el('dialog', 'history-vault-dialog');
  dialog.setAttribute('aria-label', title);
  const surface = el('div', 'history-vault-dialog__surface');
  const eyebrow = el('p', 'history-vault-dialog__eyebrow', dangerous ? 'PDF HISTORY · RESET' : 'PDF HISTORY · SECURITY');
  const heading = el('h2', 'history-vault-dialog__title', title);
  const note = el('p', 'history-vault-dialog__description', description);
  const form = el('form', 'history-vault-dialog__form');
  form.noValidate = true;
  // A stable form identity and a non-personal username help password managers
  // distinguish this local history password from other WORKBENCH credentials.
  if (purpose) {
    form.id = `workbench-history-${purpose}-form`;
    form.name = `workbench-history-${purpose}-form`;
    form.autocomplete = 'on';
    const username = el('input', 'history-vault-dialog__username');
    username.type = 'text';
    username.id = `workbench-history-${purpose}-username`;
    username.name = 'username';
    username.autocomplete = 'section-workbench-history username';
    username.value = 'workbench-pdf-history';
    username.tabIndex = -1;
    username.setAttribute('aria-label', 'PDF履歴の識別名');
    form.append(username);
  }
  const alert = el('p', 'history-vault-dialog__error');
  alert.setAttribute('role', 'alert');
  alert.setAttribute('aria-live', 'polite');
  const actions = el('div', 'history-vault-dialog__actions');
  surface.append(eyebrow, heading, note, form);
  form.append(alert, actions);
  dialog.append(surface);
  document.body.appendChild(dialog);
  return {dialog, form, alert, actions};
}
function field(label, autocomplete, placeholder, identifier) {
  const wrapper = el('label', 'history-vault-dialog__field');
  const title = el('span', 'history-vault-dialog__label', label);
  const input = el('input', 'history-vault-dialog__input');
  input.type = 'password'; input.required = true;
  input.id = `workbench-history-${identifier}`;
  input.name = `workbench_history_${identifier.replace(/-/g, '_')}`;
  input.autocomplete = `section-workbench-history ${autocomplete}`;
  input.placeholder = placeholder;
  input.setAttribute('aria-label', label);
  wrapper.append(title,input);
  return {wrapper,input};
}
function button(text, kind = 'secondary', type = 'button') {
  const node = el('button', `history-vault-dialog__button history-vault-dialog__button--${kind}`, text);
  node.type=type;
  return node;
}
function showDialog(dialog, focus) {
  try {dialog.showModal();focus?.focus();}
  catch (cause) {dialog.remove();throw cause;}
}
function finishDialog(dialog, fields) {
  for (const input of fields) input.value='';
  if (dialog.open) dialog.close();
  dialog.remove();
}
/** Return a password, a reset action or null. Never persist entered credentials. */
export function promptVaultPassword(create, errorMessage = '') {
  if (typeof document === 'undefined') return Promise.reject(new Error('ブラウザのパスワード画面が必要です。'));
  return new Promise((resolve, reject) => {
    const ui = makeDialog(create?'PDF履歴のパスワードを設定':'PDF履歴のロックを解除',
      create?'PDF履歴のPDF本体・ファイル名・宛先名を暗号化します。従来の平文PDF履歴も削除せず暗号化して引き継ぎます。12文字以上のパスワードを設定してください。':'PDF履歴専用のパスワードを入力してください。ほかのWORKBENCHのパスワードとは独立しています。',
      false, create?'setup':'unlock');
    const pass=field(create?'新しいパスワード':'履歴パスワード',create?'new-password':'current-password','12文字以上',create?'new-password':'current-password');
    const confirm=field('パスワードをもう一度入力','new-password','確認用パスワード','confirm-password');
    const hint=el('p','history-vault-dialog__hint','パスワードを忘れると履歴の復号はできません。');
    ui.form.insertBefore(pass.wrapper,ui.alert);
    if(create) ui.form.insertBefore(confirm.wrapper,ui.alert);
    ui.form.insertBefore(hint,ui.alert);
    ui.alert.textContent=errorMessage;
    const cancel=button('キャンセル');
    const okay=button(create?'設定して続行':'ロック解除','primary','submit');
    const forgot=create?null:button('パスワードを忘れた場合','link');
    if(forgot){const left=el('div','history-vault-dialog__action-left');left.append(forgot);ui.actions.append(left);}
    ui.actions.append(cancel,okay);
    let settled=false;
    const close = outcome => {if(settled)return;settled=true;finishDialog(ui.dialog,[pass.input,confirm.input]);resolve(outcome);};
    cancel.addEventListener('click',()=>close(null));
    forgot?.addEventListener('click',()=>close({reset:true}));
    ui.dialog.addEventListener('cancel',event=>{event.preventDefault();close(null);});
    ui.form.addEventListener('submit',event=>{
      event.preventDefault();
      if(create && pass.input.value.length<12){ui.alert.textContent='12文字以上のパスワードを設定してください。';return;}
      if(create && pass.input.value!==confirm.input.value){ui.alert.textContent='確認用のパスワードが一致しません。';return;}
      close(pass.input.value);
    });
    try{showDialog(ui.dialog,pass.input);}catch(cause){reject(cause);}
  });
}
/** Require an explicit typed confirmation: no old password means NO recovery. */
export function confirmVaultReset(count) {
  return new Promise((resolve,reject)=>{
    const ui=makeDialog('履歴を初期化する',
      `パスワードを忘れた場合、暗号化済みのPDF履歴${count.toLocaleString('ja-JP')}件は復号できません。初期化すると、このブラウザのPDF履歴と暗号化設定を完全に削除します。WORKBENCHのほかのデータは削除しません。`,true);
    const warning=el('p','history-vault-dialog__warning',
      'この操作は取り消せません。過去に保存したバックアップに履歴が残っていても、その履歴を開くには元のパスワードが必要です。');
    const confirmation=el('label','history-vault-dialog__field');
    confirmation.append(el('span','history-vault-dialog__label',`確認のため「${DELETE_PHRASE}」と入力してください`));
    const input=el('input','history-vault-dialog__input');input.type='text';input.autocomplete='off';input.spellcheck=false;
    confirmation.append(input);ui.form.insertBefore(warning,ui.alert);ui.form.insertBefore(confirmation,ui.alert);
    const cancel=button('キャンセル');const remove=button('履歴を完全に削除','danger','submit');ui.actions.append(cancel,remove);
    let settled=false;
    const close = value=>{if(settled)return;settled=true;finishDialog(ui.dialog,[input]);resolve(value);};
    cancel.addEventListener('click',()=>close(false));
    ui.dialog.addEventListener('cancel',e=>{e.preventDefault();close(false);});
    ui.form.addEventListener('submit',e=>{e.preventDefault();if(input.value!==DELETE_PHRASE){ui.alert.textContent='確認用の文字が一致しません。';return;}close(true);});
    try{showDialog(ui.dialog,input);}catch(e){reject(e);}
  });
}
/** Keeping the modal open on incorrect password or storage errors avoids ambiguous outcomes. */
export function promptVaultPasswordChange(onChange) {
  return new Promise((resolve,reject)=>{
    const ui=makeDialog('履歴パスワードを変更',
      '現在のパスワードで履歴を確認し、新しいパスワードへ暗号化し直します。履歴が多い場合は空き容量と処理時間が必要です。変更中は画面やタブを閉じないでください。以前に作成したバックアップは、その当時のパスワードで開きます。', false, 'change');
    const old=field('現在のパスワード','current-password','現在のパスワード','current-password');
    const fresh=field('新しいパスワード（12文字以上）','new-password','新しいパスワード','new-password');
    const again=field('新しいパスワードを再入力','new-password','確認用パスワード','confirm-password');
    const status=el('p','history-vault-dialog__progress');status.setAttribute('aria-live','polite');
    for(const x of [old,fresh,again])ui.form.insertBefore(x.wrapper,ui.alert);
    ui.form.insertBefore(status,ui.alert);
    const cancel=button('キャンセル');const submit=button('パスワードを変更','primary','submit');ui.actions.append(cancel,submit);
    let settled=false;let busy=false;
    const close=value=>{if(settled)return;settled=true;finishDialog(ui.dialog,[old.input,fresh.input,again.input]);resolve(value);};
    cancel.addEventListener('click',()=>{if(!busy)close(false);});
    ui.dialog.addEventListener('cancel',e=>{e.preventDefault();if(!busy)close(false);});
    ui.form.addEventListener('submit',async e=>{
      e.preventDefault();if(busy)return;
      if(fresh.input.value.length<12){ui.alert.textContent='新しいパスワードは12文字以上で設定してください。';return;}
      if(fresh.input.value!==again.input.value){ui.alert.textContent='確認用のパスワードが一致しません。';return;}
      if(old.input.value===fresh.input.value){ui.alert.textContent='現在のパスワードとは異なるものを指定してください。';return;}
      ui.alert.textContent='';busy=true;cancel.disabled=true;submit.disabled=true;status.textContent='履歴を再暗号化しています。画面を閉じないでください…';
      try {await onChange(old.input.value,fresh.input.value);close(true);}
      catch(err) {ui.alert.textContent=err instanceof Error?err.message:'変更に失敗しました。';status.textContent='';}
      finally {busy=false;cancel.disabled=false;submit.disabled=false;}
    });
    try{showDialog(ui.dialog,old.input);}catch(e){reject(e);}
  });
}

/** Show how many legacy plaintext PDF records have been replaced in IndexedDB.
 * Display only counts, never filenames, recipients or plaintext data. */
export function beginVaultMigration(total) {
  if (!total || typeof document === 'undefined' || !document.body || !document.createElement) {
    return {update() {}, finish() {}};
  }
  const notice = el('div', 'history-vault-migration-status');
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  const title = el('p', 'history-vault-migration-status__title', '旧PDF履歴の暗号化移行');
  const detail = el('p', 'history-vault-migration-status__detail',
    `既存の平文PDF履歴 ${total} 件を暗号化しています。タブを閉じないでください。`);
  notice.append(title, detail);
  document.body.appendChild(notice);
  let ended = false;
  return {
    update(done) {
      if (!ended) detail.textContent = `${done} / ${total} 件を暗号化しました。タブを閉じないでください。`;
    },
    finish(succeeded, done) {
      if (ended) return;
      ended = true;
      detail.textContent = succeeded
        ? `以前の平文PDF履歴 ${total} 件を暗号化して引き継ぎました。`
        : `${done} / ${total} 件まで移行しました。残りは次回の解除時に再開します。`;
      notice.classList.add(succeeded ? 'history-vault-migration-status--complete' : 'history-vault-migration-status--incomplete');
      const dismiss = el('button', 'history-vault-migration-status__dismiss', '閉じる');
      dismiss.type = 'button';
      dismiss.addEventListener('click', () => notice.remove());
      notice.append(dismiss);
    }
  };
}
