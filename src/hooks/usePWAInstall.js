import { useState, useEffect } from 'react';

/**
 * Custom hook to handle PWA installation
 * Tracks the installment state and provides a function to trigger the prompt
 * 
 * DEVELOPMENT MODE: Set to true to always show install button for testing
 */
const DEV_MODE = import.meta.env.DEV; // true in development, false in production

const usePWAInstall = () => {
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(DEV_MODE); // Show in dev mode by default
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {

        // Check if the app is already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

        if (isStandalone) {
            setIsInstalled(true);
            setIsInstallable(false); // Don't show install button if already installed
            return;
        }

        const handleBeforeInstallPrompt = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setInstallPrompt(e);
            setIsInstallable(true);
        };

        const handleAppInstalled = () => {
            // Clear the deferredPrompt so it can be garbage collected
            setInstallPrompt(null);
            setIsInstallable(false);
            setIsInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {

        if (!installPrompt) {
            if (DEV_MODE) {
                alert('Install prompt not available yet. This button is visible in dev mode for testing. In production, it will only show when the browser confirms the app is installable.');
            }
            return;
        }

        try {
            // Show the install prompt
            installPrompt.prompt();

            // Wait for the user to respond to the prompt
            const { outcome } = await installPrompt.userChoice;

            // We've used the prompt, and can't use it again, throw it away
            setInstallPrompt(null);
            setIsInstallable(false);
        } catch (error) {
        }
    };

    return { isInstallable, isInstalled, handleInstallClick };
};

export default usePWAInstall;
