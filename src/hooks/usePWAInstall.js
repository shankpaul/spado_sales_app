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
        console.log('🔧 PWA Install Hook initialized');
        console.log('📱 Development mode:', DEV_MODE);

        // Check if the app is already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        console.log('📲 Running in standalone mode:', isStandalone);

        if (isStandalone) {
            setIsInstalled(true);
            setIsInstallable(false); // Don't show install button if already installed
            console.log('✅ App is already installed');
            return;
        }

        const handleBeforeInstallPrompt = (e) => {
            console.log('🎯 beforeinstallprompt event fired!');
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setInstallPrompt(e);
            setIsInstallable(true);
        };

        const handleAppInstalled = () => {
            console.log('✅ PWA was installed successfully');
            // Clear the deferredPrompt so it can be garbage collected
            setInstallPrompt(null);
            setIsInstallable(false);
            setIsInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // Log after a delay to see if event fires
        setTimeout(() => {
            if (!installPrompt && !isStandalone) {
                console.log('⚠️ beforeinstallprompt event has not fired yet');
                console.log('💡 This is normal if:');
                console.log('   - App is already installed');
                console.log('   - Not served over HTTPS (except localhost)');
                console.log('   - Service worker not registered yet');
                console.log('   - PWA criteria not met');
                if (DEV_MODE) {
                    console.log('🔧 DEV MODE: Install button will show anyway for testing');
                }
            }
        }, 2000);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        console.log('🔘 Install button clicked');

        if (!installPrompt) {
            console.log('⚠️ No install prompt available');
            if (DEV_MODE) {
                alert('Install prompt not available yet. This button is visible in dev mode for testing. In production, it will only show when the browser confirms the app is installable.');
            }
            return;
        }

        try {
            // Show the install prompt
            console.log('📱 Showing install prompt...');
            installPrompt.prompt();

            // Wait for the user to respond to the prompt
            const { outcome } = await installPrompt.userChoice;
            console.log(`👤 User response: ${outcome}`);

            // We've used the prompt, and can't use it again, throw it away
            setInstallPrompt(null);
            setIsInstallable(false);
        } catch (error) {
            console.error('❌ Error during installation:', error);
        }
    };

    return { isInstallable, isInstalled, handleInstallClick };
};

export default usePWAInstall;
