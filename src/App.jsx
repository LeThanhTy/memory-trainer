import React, { useEffect, useMemo, useRef, useState } from "react";
import { translations } from "./translations";

function sanitize(text) {
  return text.replace(/[\u200B-\u200D\uFEFF]/g, "");
}
function stripPunctuation(s) {
  return s.replace(/[\p{P}\p{S}]/gu, "");
}
function normalize(s, { ignoreCase, ignorePunc }) {
  let out = sanitize(s);
  if (ignorePunc) out = stripPunctuation(out);
  if (ignoreCase) out = out.toLowerCase();
  return out;
}
function splitWords(s) {
  return s.trim().split(/\s+/).filter(Boolean);
}
function calcStats(reference, attempt, opts) {
  const refN = normalize(reference, opts);
  const attN = normalize(attempt, opts);
  const refWords = splitWords(refN);
  const attWords = splitWords(attN);
  const total = refWords.length || 1;
  let correct = 0;
  for (let i = 0; i < Math.min(refWords.length, attWords.length); i++) {
    if (refWords[i] === attWords[i]) correct++;
  }
  const accuracy = Math.max(0, Math.min(100, Math.round((correct / total) * 100)));
  const wordsTyped = attWords.length;
  return { accuracy, wordsTyped, totalWords: refWords.length };
}
function useTimer(active) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  const reset = () => setSeconds(0);
  return { seconds, reset };
}
function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}
function Highlighter({ reference, attempt, opts, hideWords }) {
  const refRawWords = splitWords(reference);
  const refNWords = splitWords(normalize(reference, opts));
  const attNWords = splitWords(normalize(attempt, opts));
  return (
    <div className="leading-8 flex flex-wrap">
      {refRawWords.map((rawWord, i) => {
        const refN = refNWords[i] ?? "";
        const attN = attNWords[i] ?? "";
        const match = refN && refN === attN;
        const state = attN === undefined || attN === "" ? "missing" : match ? "ok" : "no";
        const base =
          state === "ok"
            ? "bg-green-100 text-green-900 border-green-300"
            : state === "no"
            ? "bg-red-100 text-red-900 border-red-300"
            : "bg-yellow-50 text-yellow-800 border-yellow-200";
        const displayWord = hideWords ? "\u00A0".repeat(Math.max(1, rawWord.length)) : rawWord;
        return (
          <span key={i} className={`px-1 py-0.5 border rounded-sm mr-1 mb-1 inline-block ${base}`}>
            {displayWord}
          </span>
        );
      })}
    </div>
  );
}
export default function MemoryTypingTrainer() {
  const [reference, setReference] = useState(() => localStorage.getItem("memref") || "The quick brown fox jumps over the lazy dog.");
  const [attempt, setAttempt] = useState(() => localStorage.getItem("memattempt") || "");
  const [hidden, setHidden] = useState(false);
  const [started, setStarted] = useState(false);
  const [opts, setOpts] = useState({ ignoreCase: true, ignorePunc: false });
  const { seconds, reset } = useTimer(started);
  const attemptRef = useRef(null);
  const [hideWords, setHideWords] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem("memlang") || "en");
  useEffect(() => { localStorage.setItem("memref", reference); }, [reference]);
  useEffect(() => { localStorage.setItem("memattempt", attempt); }, [attempt]);
  useEffect(() => { localStorage.setItem("memlang", lang); }, [lang]);
  
  const t = translations[lang] || translations.en;
  const stats = useMemo(() => calcStats(reference, attempt, opts), [reference, attempt, opts]);
  const wpm = useMemo(() => {
    const minutes = Math.max(1 / 60, seconds / 60);
    return Math.round((stats.wordsTyped / minutes) || 0);
  }, [stats.wordsTyped, seconds]);
  function handleStart() { setHidden(true); setStarted(true); reset(); setAttempt(""); setTimeout(() => attemptRef.current?.focus(), 0); }
  function handleReveal() { setHidden(false); setStarted(false); }
  function handleResetAll() { setReference(""); setAttempt(""); setHidden(false); setStarted(false); reset(); }
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 p-6 mem-root">
      <style>{`
        .mem-root textarea { min-height: 8rem; }
        .mem-root .leading-8 { gap: .25rem; }
        @media (max-width: 640px) {
          .mem-root { padding: 1rem; }
          .mem-root .text-3xl { font-size: 1.25rem; }
          .mem-root textarea { min-height: 7rem; }
          .mem-root .flex.gap-3.text-sm { display: flex; flex-wrap: wrap; gap: .4rem; }
          .mem-root .px-2.py-1.rounded-lg { padding: .35rem .5rem; }
          .mem-root .lang-switch { top: .5rem; right: .5rem; }
        }
      `}</style>
      <div className="max-w-5xl mx-auto relative">
        <div className="absolute lang-switch top-2 right-2 flex items-center gap-2 bg-white bg-opacity-80 rounded-full px-2 py-1 shadow-sm">
          <span className="text-sm text-slate-600 font-medium">{t.languageLabel}</span>
          <button onClick={() => setLang(lang === "en" ? "vi" : "en")} className="px-3 py-1 rounded-full shadow-sm border hover:bg-slate-50 font-semibold">{lang === "en" ? "VI" : "EN"}</button>
        </div>
        <header className="mb-6 pt-20">
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-slate-600 mt-1">{t.description}</p>
        </header>
        <div className="grid gap-4">
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">{t.referenceText}</h2>
              <div className="flex gap-2">
                {!hidden ? (
                  <button onClick={handleStart} className="px-3 py-1.5 rounded-xl shadow-sm border bg-slate-900 text-white hover:bg-slate-800">{t.start}</button>
                ) : (
                  <button onClick={handleReveal} className="px-3 py-1.5 rounded-xl shadow-sm border hover:bg-slate-50">{t.reveal}</button>
                )}
              </div>
            </div>
            {!hidden ? (
              <textarea value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t.placeholderRef} className="w-full h-40 resize-vertical p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
            ) : (
              <div className="w-full h-40 border rounded-xl bg-slate-100 grid place-items-center text-slate-500 select-none">{t.hiddenNotice}</div>
            )}
            <div className="mt-3 flex flex-wrap gap-4 items-center text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={opts.ignoreCase} onChange={(e) => setOpts((o) => ({ ...o, ignoreCase: e.target.checked }))} />{t.ignoreCase}</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={opts.ignorePunc} onChange={(e) => setOpts((o) => ({ ...o, ignorePunc: e.target.checked }))} />{t.ignorePunc}</label>
              <button onClick={handleResetAll} className="ml-auto px-3 py-1.5 rounded-xl shadow-sm border hover:bg-slate-50">{t.reset}</button>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">{t.typeFromMemory}</h2>
              <div className="flex gap-3 text-sm">
                <div className="px-2 py-1 rounded-lg bg-slate-50 border">{t.time}: <span className="font-semibold">{formatTime(seconds)}</span></div>
                <div className="px-2 py-1 rounded-lg bg-slate-50 border">{t.accuracy}: <span className="font-semibold">{stats.accuracy}%</span></div>
                <div className="px-2 py-1 rounded-lg bg-slate-50 border">{t.wpm}: <span className="font-semibold">{wpm}</span></div>
                <div className="px-2 py-1 rounded-lg bg-slate-50 border">{t.words}: <span className="font-semibold">{stats.wordsTyped}/{stats.totalWords}</span></div>
              </div>
            </div>
            <textarea ref={attemptRef} value={attempt} onChange={(e) => setAttempt(e.target.value)} placeholder={hidden ? t.placeholderAttemptHidden : t.placeholderAttemptVisible} className="w-full h-40 resize-vertical p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{t.feedback}</h3>
                <div className="flex gap-2">
                  <button onClick={() => setHideWords((h) => !h)} className="px-3 py-1.5 rounded-xl shadow-sm border hover:bg-slate-50 text-sm">{hideWords ? t.showWords : t.hideWords}</button>
                </div>
              </div>
              <Highlighter reference={reference} attempt={attempt} opts={opts} hideWords={hideWords} />
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-2">{t.tips}</h2>
            <ul className="list-disc pl-6 text-slate-700 space-y-1">
              {t.tipsList.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          </div>
        </div>
        <footer className="text-center text-xs text-slate-500 mt-8">Built for memory practice – single-file React + Tailwind</footer>
      </div>
    </div>
  );
}
