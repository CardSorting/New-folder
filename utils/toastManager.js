class ToastManager {
    static show(message, type = 'info') {
        const toast = document.createElement('div');
        const colors = {
            info: 'bg-blue-500',
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500'
        };

        toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white ${colors[type]} shadow-lg transition-opacity duration-300`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Fade in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
        });

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

window.ToastManager = ToastManager;
