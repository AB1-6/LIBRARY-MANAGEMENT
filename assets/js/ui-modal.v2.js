// Simple in-app modal helper
(function () {
    function getModal() {
        return {
            root: document.getElementById('appModal'),
            title: document.getElementById('appModalTitle'),
            body: document.getElementById('appModalBody'),
            submit: document.getElementById('appModalSubmit'),
            cancel: document.getElementById('appModalCancel'),
            close: document.getElementById('appModalClose'),
            backdrop: document.getElementById('appModalBackdrop')
        };
    }

    const state = {
        onSubmit: null,
        onCancel: null
    };

    function open(options) {
        const modal = getModal();
        if (!modal.root) {
            return;
        }
        modal.title.textContent = options.title || 'Dialog';
        modal.body.innerHTML = options.bodyHtml || '';

        modal.submit.textContent = options.submitLabel || 'Save';
        modal.submit.style.display = 'inline-flex';
        modal.cancel.textContent = options.cancelLabel || 'Cancel';
        modal.cancel.style.display = options.showCancel === false ? 'none' : 'inline-flex';

        state.onSubmit = options.onSubmit || null;
        state.onCancel = options.onCancel || null;

        modal.root.classList.add('show');
        modal.root.setAttribute('aria-hidden', 'false');
    }

    function close() {
        const modal = getModal();
        if (!modal.root) {
            return;
        }
        modal.root.classList.remove('show');
        modal.root.setAttribute('aria-hidden', 'true');
        if (modal.body) {
            modal.body.innerHTML = '';
        }
        state.onSubmit = null;
        state.onCancel = null;
    }

    function bind() {
        const modal = getModal();
        if (!modal.root) {
            return;
        }

        modal.submit.addEventListener('click', function () {
            if (!state.onSubmit) {
                close();
                return;
            }
            const result = state.onSubmit();
            if (result !== false) {
                close();
            }
        });

        modal.cancel.addEventListener('click', function () {
            if (state.onCancel) {
                state.onCancel();
            }
            close();
        });

        modal.close.addEventListener('click', close);
        if (modal.backdrop) {
            modal.backdrop.addEventListener('click', close);
        }
    }

    function openMessage(title, message, buttonLabel) {
        open({
            title: title,
            bodyHtml: '<p>' + message + '</p>',
            submitLabel: buttonLabel || 'OK',
            showCancel: false
        });
    }

    function openConfirm(title, message, onConfirm, confirmLabel, cancelLabel) {
        open({
            title: title,
            bodyHtml: '<p>' + message + '</p>',
            submitLabel: confirmLabel || 'Confirm',
            cancelLabel: cancelLabel || 'Cancel',
            showCancel: true,
            onSubmit: function () {
                if (onConfirm) {
                    onConfirm();
                }
            }
        });
    }

    document.addEventListener('DOMContentLoaded', bind);

    window.ModalUI = {
        open: open,
        close: close,
        openMessage: openMessage,
        openConfirm: openConfirm
    };
})();
