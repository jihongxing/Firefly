import { useEffect, useMemo, useState } from 'react';
import { Download, Home, Share2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

const INSTALL_STATE_KEY = 'firefly-pwa-installed';

const isStandalone = () => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

const isIosSafari = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios/.test(userAgent);
  return isIos && isSafari;
};

export default function PwaInstallPrompt() {
  const { t } = useTranslation();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint] = useState(() => isIosSafari());
  const [showManualHint, setShowManualHint] = useState(false);
  const [isVisible, setIsVisible] = useState(() => isIosSafari());
  const [hasDismissed, setHasDismissed] = useState(false);

  const alreadyInstalled = useMemo(() => {
    return isStandalone() || localStorage.getItem(INSTALL_STATE_KEY) === 'true';
  }, []);

  useEffect(() => {
    if (alreadyInstalled) {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleInstalled = () => {
      localStorage.setItem(INSTALL_STATE_KEY, 'true');
      setIsVisible(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    const fallbackPrompt = window.setTimeout(() => {
      setShowManualHint(true);
      setIsVisible(true);
    }, 1200);

    return () => {
      window.clearTimeout(fallbackPrompt);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [alreadyInstalled]);

  const handleInstall = async () => {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (choice.outcome === 'accepted') {
      localStorage.setItem(INSTALL_STATE_KEY, 'true');
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setHasDismissed(true);
    setIsVisible(false);
  };

  if (alreadyInstalled || hasDismissed || !isVisible || (!installPrompt && !showIosHint && !showManualHint)) {
    return null;
  }

  return (
    <aside className="ff-pwa-prompt" role="dialog" aria-live="polite" aria-label={t('pwa.title')}>
      <div className="ff-pwa-prompt__icon" aria-hidden="true">
        <Home size={18} />
      </div>
      <div className="ff-pwa-prompt__copy">
        <h2>{t('pwa.title')}</h2>
        <p>{showIosHint ? t('pwa.iosBody') : showManualHint && !installPrompt ? t('pwa.manualBody') : t('pwa.body')}</p>
      </div>
      {installPrompt ? (
        <button type="button" className="ff-pwa-prompt__install" onClick={handleInstall}>
          <Download size={16} />
          <span>{t('pwa.install')}</span>
        </button>
      ) : showIosHint ? (
        <div className="ff-pwa-prompt__ios">
          <Share2 size={16} />
          <span>{t('pwa.iosAction')}</span>
        </div>
      ) : (
        <div className="ff-pwa-prompt__ios">
          <Download size={16} />
          <span>{t('pwa.manualAction')}</span>
        </div>
      )}
      <button type="button" className="ff-pwa-prompt__close" onClick={handleDismiss} aria-label={t('pwa.dismiss')}>
        <X size={18} />
      </button>
    </aside>
  );
}
