import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const useKeyboardShortcuts = (onToggleSidebar, onShowHelp) => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyPress = (event) => {
            // Ignore if user is typing in an input/textarea
            if (
                event.target.tagName === 'INPUT' ||
                event.target.tagName === 'TEXTAREA' ||
                event.target.isContentEditable
            ) {
                return;
            }

            // Show help with ? or Shift+/
            if (event.key === '?' || (event.shiftKey && event.key === '/')) {
                event.preventDefault();
                if (onShowHelp) onShowHelp();
                return;
            }

            // All other shortcuts require Ctrl (or Cmd on Mac)
            if (!event.ctrlKey && !event.metaKey) return;

            switch (event.key.toLowerCase()) {
                case 'd':
                    event.preventDefault();
                    navigate('/dashboard');
                    break;
                case 'm':
                    event.preventDefault();
                    navigate('/monitoring');
                    break;
                case 'a':
                    event.preventDefault();
                    navigate('/analytics');
                    break;
                case 'l':
                    event.preventDefault();
                    navigate('/alarms');
                    break;
                case 'h':
                    event.preventDefault();
                    navigate('/help');
                    break;
                case 's':
                    event.preventDefault();
                    navigate('/settings');
                    break;
                case 'b':
                    event.preventDefault();
                    if (onToggleSidebar) onToggleSidebar();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);

        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [navigate, onToggleSidebar, onShowHelp]);
};

export default useKeyboardShortcuts;
