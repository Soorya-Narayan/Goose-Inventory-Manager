// src/components/GooseAssistant/GooseAssistant.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import styles from './GooseAssistant.module.css';
import logo from '../../assets/goose_logo.jpeg';
import ChatRenderer from './ChatRenderer';

// Suggestion dictionary for smart auto-complete
const SUGGESTIONS = [
    { text: "What is the cost per cycle?", keywords: ["cost", "price", "expense", "spend"] },
    { text: "Water consumption", keywords: ["water", "usage", "consumption"] },
    { text: "Energy usage", keywords: ["energy", "power", "kwh"] },
    { text: "Chemical usage", keywords: ["chemical", "caustic", "acid"] },
    { text: "Show temperature trends", keywords: ["temperature", "temp", "trend", "chart", "graph"] },
    { text: "Show pressure chart", keywords: ["pressure", "bar", "trend", "chart"] },
    { text: "Show flow rate trends", keywords: ["flow", "rate", "trend"] },
    { text: "Cycle status", keywords: ["cycle", "status", "running"] },
    { text: "How long does a cycle take?", keywords: ["how long", "duration", "time"] },
    { text: "Equipment details", keywords: ["equipment", "specs", "tank", "pump", "valve"] },
    { text: "What AI models do you have?", keywords: ["ai", "model", "ml", "machine learning"] },
    { text: "Sustainability score", keywords: ["sustainability", "eco", "green", "efficiency"] },
    { text: "Active alarms", keywords: ["alarm", "alert", "warning"] },
    { text: "Go to AI diagnostics", keywords: ["go", "navigate", "ai diagnostics"] },
    { text: "Go to analytics", keywords: ["go", "navigate", "analytics"] },
    { text: "Go to alarms", keywords: ["go", "navigate", "alarms"] },
    { text: "Go to settings", keywords: ["go", "navigate", "settings"] },
];

const GooseAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Honk! I am Goose Assistant. Navigate, check status, or export data with me!"
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

    // For auto-scrolling, outside click, and auto-resize
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const textareaRef = useRef(null);

    // Resize textarea based on content
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset height
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`; // Adjust
        }
    }, [inputValue]);

    const { currentState, activeAlarms, liveParameters, API_BASE_URL, toggleTheme, isDarkTheme, dataQuery } = useAppContext();
    const navigate = useNavigate();

    // Load conversation history from localStorage on mount
    useEffect(() => {
        const savedMessages = localStorage.getItem('goose_conversation_history');
        if (savedMessages) {
            try {
                const parsed = JSON.parse(savedMessages);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMessages(parsed);
                }
            } catch (e) {
                console.error('Failed to load conversation history:', e);
            }
        }
    }, []);

    // Save conversation history to localStorage whenever messages change
    useEffect(() => {
        if (messages.length > 1) { // Don't save just the welcome message
            try {
                // Keep only last 50 messages to avoid localStorage size limits
                const messagesToSave = messages.slice(-50);
                localStorage.setItem('goose_conversation_history', JSON.stringify(messagesToSave));
            } catch (e) {
                console.error('Failed to save conversation history:', e);
            }
        }
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]); // Also scroll when opening

    // Fix 3: Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (chatContainerRef.current && !chatContainerRef.current.contains(event.target) && isOpen) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage = inputValue.trim();
        setInputValue('');

        // 1. Add User Message with timestamp
        setMessages(prev => [...prev, {
            role: 'user',
            content: userMessage,
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }]);
        setIsLoading(true);

        try {
            // 2. Prepare Context with conversation history for context-aware responses
            const conversationHistory = messages.slice(-5).map(m => ({
                role: m.role,
                content: m.content
            }));

            const context = {
                status: currentState,
                alarms: activeAlarms || [],
                conversationHistory: conversationHistory
            };

            // 3. Call Backend
            const res = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    context: context
                })
            });

            const data = await res.json();

            if (res.ok) {
                const answer = data.answer || "Honk? I didn't get that.";

                // 4. Parse Command Codes
                const navMatch = answer.match(/\[NAVIGATE:([a-zA-Z0-9\-/]+)\]/);
                const exportMatch = answer.match(/\[EXPORT:([a-zA-Z0-9]+)\]/);
                const themeMatch = answer.match(/\[THEME:([a-zA-Z]+)\]/);
                const cycleMatch = answer.match(/\[CYCLE:([a-zA-Z]+)\]/);
                const circuitMatch = answer.match(/\[CIRCUIT:([A-Z])\]/);

                let displayContent = answer
                    .replace(/\[NAVIGATE:.*?\]/g, '')
                    .replace(/\[EXPORT:.*?\]/g, '')
                    .replace(/\[THEME:.*?\]/g, '')
                    .replace(/\[CYCLE:.*?\]/g, '')
                    .replace(/\[CIRCUIT:.*?\]/g, '')
                    .trim();

                const newMsg = {
                    role: 'assistant',
                    content: displayContent,
                    actions: data.actions || [], // Store actions if present
                    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                };

                // Executing "Action Schema" if present
                if (data.actions && data.actions.length > 0) {
                    for (const action of data.actions) {
                        if (action.tool === 'RENDER_CHART' || action.tool === 'RENDER_TABLE') {
                            // Fetch data if not provided
                            if ((!action.args.data && !action.args.rows)) {
                                // Construct query from action args
                                const queryTool = action.args.data_source || 'query_historical_data';
                                const queryArgs = action.args.params || {};

                                const result = await dataQuery({ tool: queryTool, args: queryArgs });

                                if (result.status === 'success') {
                                    if (action.tool === 'RENDER_CHART') {
                                        action.args.data = result.data;
                                    } else {
                                        action.args.rows = result.data;
                                    }
                                }
                            }
                        }
                    }
                }

                setMessages(prev => [...prev, newMsg]);

                // Execute Commands
                if (navMatch) {
                    const targetPath = navMatch[1];
                    setTimeout(() => {
                        navigate(targetPath);
                    }, 800);
                }

                if (exportMatch) {
                    handleDataExport(exportMatch[1]);
                }

                if (themeMatch) {
                    handleThemeControl(themeMatch[1]);
                }

                if (cycleMatch) {
                    handleCycleControl(cycleMatch[1]);
                }

                if (circuitMatch) {
                    handleCircuitControl(circuitMatch[1]);
                }

            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong! Honk!" }]);
            }

        } catch (error) {
            console.error("Assistant Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Connection error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDataExport = (type) => {
        // Trigger generic trend export for demo
        fetch(`${API_BASE_URL}/export/trends`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                trendType: 'conductivity', // Default for demo
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString()
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.data) {
                    // Trigger CSV download
                    const blob = new Blob([data.data], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = data.filename || 'export.csv';
                    a.click();
                    setMessages(prev => [...prev, { role: 'assistant', content: "✅ Export downloaded successfully!" }]);
                }
            })
            .catch(err => {
                setMessages(prev => [...prev, { role: 'assistant', content: "❌ Export failed to download." }]);
            });
    };

    // Helper to render formatted text (markdown-style)
    const renderFormattedText = (text) => {
        // Split by newlines and process each line
        const lines = text.split('\n');
        return lines.map((line, idx) => {
            // Replace **text** with <strong>
            let formatted = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

            return (
                <div key={idx} dangerouslySetInnerHTML={{ __html: formatted }} />
            );
        });
    };

    const handleThemeControl = (action) => {
        if (action === 'dark' && !isDarkTheme) {
            toggleTheme();
            setMessages(prev => [...prev, { role: 'assistant', content: "✅ Dark mode activated!" }]);
        } else if (action === 'light' && isDarkTheme) {
            toggleTheme();
            setMessages(prev => [...prev, { role: 'assistant', content: "✅ Light mode activated!" }]);
        } else if (action === 'toggle') {
            toggleTheme();
            setMessages(prev => [...prev, { role: 'assistant', content: `✅ Theme switched to ${isDarkTheme ? 'light' : 'dark'} mode!` }]);
        }
    };

    const handleCycleControl = async (action) => {
        try {
            const endpoint = action === 'start' ? '/cycle/start' :
                action === 'stop' ? '/cycle/stop' :
                    action === 'pause' ? '/cycle/pause' :
                        '/cycle/resume';

            const res = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                setMessages(prev => [...prev, { role: 'assistant', content: `✅ Cycle ${action}ed successfully!` }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: `❌ Failed to ${action} cycle.` }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error controlling cycle.` }]);
        }
    };

    const handleCircuitControl = async (circuit) => {
        try {
            const res = await fetch(`${API_BASE_URL}/circuit/switch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ circuit: circuit })
            });

            if (res.ok) {
                setMessages(prev => [...prev, { role: 'assistant', content: `✅ Switched to Circuit ${circuit}!` }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: `❌ Failed to switch circuit.` }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error switching circuit.` }]);
        }
    };

    // Handle input change with auto-suggestions
    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);

        // Filter suggestions
        if (value.trim().length > 1) {
            const filtered = SUGGESTIONS.filter(suggestion =>
                suggestion.keywords.some(keyword =>
                    keyword.toLowerCase().includes(value.toLowerCase())
                ) || suggestion.text.toLowerCase().includes(value.toLowerCase())
            );
            setSuggestions(filtered.slice(0, 5)); // Show max 5 suggestions
            setShowSuggestions(filtered.length > 0);
            setSelectedSuggestionIndex(0);
        } else {
            setShowSuggestions(false);
        }
    };

    // Handle suggestion selection
    const selectSuggestion = (text) => {
        setInputValue(text);
        setShowSuggestions(false);
    };

    // Clear conversation history
    const clearHistory = () => {
        const welcomeMessage = {
            role: 'assistant',
            content: "Honk! I am Goose Assistant. Navigate, check status, or export data with me!"
        };
        setMessages([welcomeMessage]);
        localStorage.removeItem('goose_conversation_history');
    };

    const handleKeyPress = (e) => {
        // Navigate suggestions with arrow keys
        if (showSuggestions) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSuggestionIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                selectSuggestion(suggestions[selectedSuggestionIndex].text);
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Toggle Button */}
            {!isOpen && (
                <button
                    className={styles.fab}
                    onClick={() => setIsOpen(true)}
                    title="Open Goose Assistant"
                >
                    <img src={logo} alt="Goose" className={styles.fabLogo} />
                </button>
            )}

            {/* Main Window */}
            {isOpen && (
                <div className={styles.chatWindow} ref={chatContainerRef}>
                    {/* Header */}
                    <div className={styles.header}>
                        <div className={styles.headerLeft}>
                            <img src={logo} alt="Goose" className={styles.headerLogo} />
                            <div className={styles.headerTitle}>
                                <h3>Goose Assistant</h3>
                                <span className={styles.status}>
                                    <span className={styles.statusDot}></span>
                                    Online
                                </span>
                            </div>
                        </div>
                        <button
                            className={styles.clearHistoryBtn}
                            onClick={clearHistory}
                            title="Clear conversation history"
                        >
                            <i className="fa-solid fa-trash"></i>
                        </button>
                        <button
                            className={styles.themeToggle}
                            onClick={toggleTheme}
                            title={isDarkTheme ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            <i className={`fa-solid fa-${isDarkTheme ? 'sun' : 'moon'}`}></i>
                        </button>
                        <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    {/* Quick Action Chips */}
                    <div className={styles.quickActions}>
                        <button onClick={() => setInputValue("What is the cost per cycle?")} className={styles.actionChip}>
                            💰 Cost
                        </button>
                        <button onClick={() => setInputValue("Show temperature trends")} className={styles.actionChip}>
                            📊 Charts
                        </button>
                        <button onClick={() => setInputValue("Cycle status")} className={styles.actionChip}>
                            🔄 Status
                        </button>
                        <button onClick={() => setInputValue("Equipment details")} className={styles.actionChip}>
                            ⚙️ Equipment
                        </button>
                        <button onClick={() => setInputValue("What AI models do you have?")} className={styles.actionChip}>
                            🤖 AI
                        </button>
                    </div>

                    {/* Messages */}
                    <div className={styles.messagesContainer}>
                        {messages.map((msg, idx) => {
                            const timestamp = msg.timestamp || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                            return (
                                <div
                                    key={idx}
                                    className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
                                >
                                    {msg.role === 'assistant' && (
                                        <img src={logo} alt="Goose" className={styles.msgAvatar} />
                                    )}

                                    <div className={styles.messageWrapper}>
                                        <div className={styles.messageContent}>
                                            {renderFormattedText(msg.content)}

                                            {/* Render Actions (Charts, Tables) */}
                                            {msg.actions && msg.actions.map((action, actionIdx) => (
                                                <ChatRenderer key={actionIdx} action={action} />
                                            ))}
                                        </div>

                                        <div className={styles.messageFooter}>
                                            <span className={styles.timestamp}>{timestamp}</span>
                                            {msg.role === 'assistant' && (
                                                <button
                                                    className={styles.copyBtn}
                                                    onClick={() => navigator.clipboard.writeText(msg.content)}
                                                    title="Copy message"
                                                >
                                                    <i className="fa-solid fa-copy"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {msg.role === 'user' && (
                                        <div className={styles.msgAvatar} style={{
                                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            fontSize: '12px'
                                        }}>
                                            U
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {isLoading && (
                            <div className={`${styles.message} ${styles.assistantMessage}`}>
                                <img src={logo} alt="Goose" className={styles.msgAvatar} />
                                <div className={styles.typingIndicator}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className={styles.inputContainer}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <textarea
                                ref={textareaRef}
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyPress}
                                placeholder="Type 'Export csv', 'Go to alarms'..."
                                rows="1"
                            />

                            {/* Suggestions Dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className={styles.suggestionsDropdown}>
                                    {suggestions.map((suggestion, idx) => (
                                        <div
                                            key={idx}
                                            className={`${styles.suggestionItem} ${idx === selectedSuggestionIndex ? styles.suggestionSelected : ''
                                                }`}
                                            onClick={() => selectSuggestion(suggestion.text)}
                                            onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                                        >
                                            <i className="fa-solid fa-lightbulb" style={{ marginRight: '8px', opacity: 0.6 }}></i>
                                            {suggestion.text}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            className={styles.sendBtn}
                            onClick={handleSend}
                            disabled={!inputValue.trim() || isLoading}
                        >
                            <i className="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default GooseAssistant;
