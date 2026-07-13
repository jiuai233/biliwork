/**
 * Web Speech API wrapper for console voice announcements.
 * Queue is capped so a gift burst cannot build up minutes of backlog.
 */

const MAX_QUEUE = 4;
let queued = 0;

export function ttsSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string) {
    if (!ttsSupported() || queued >= MAX_QUEUE) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 1.1;
    queued += 1;
    const release = () => { queued = Math.max(0, queued - 1); };
    utterance.onend = release;
    utterance.onerror = release;
    window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
    if (!ttsSupported()) return;
    window.speechSynthesis.cancel();
    queued = 0;
}
