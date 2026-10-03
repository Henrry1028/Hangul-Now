import React, { useState } from 'react';
import {
  DEFAULT_READING_GLOSSARY,
  DEFAULT_READING_GRAMMAR,
  DEFAULT_READING_PARAGRAPHS,
  DEFAULT_READING_TITLE,
  DEFAULT_READING_TRANSLATIONS,
  READING_TEXT
} from '../data/readingData.js';

function ReadingPage({ lang = 'ko' }) {
  const [selectedWordKey, setSelectedWordKey] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [saved, setSaved] = useState({});

  const L = lang === 'ko' ? 1 : 0;
  const t = READING_TEXT[lang] || READING_TEXT.ko;
  const selectedWord = selectedWordKey ? DEFAULT_READING_GLOSSARY[selectedWordKey] : null;

  const toggleSavedWord = () => {
    if (!selectedWordKey) return;
    setSaved((current) => ({
      ...current,
      [selectedWordKey]: !current[selectedWordKey]
    }));
  };

  return (
    <div className="reading-screen" data-screen-label="06 Reading">
      <div className="reading-header">
        <div className="reading-title-block">
          <span className="reading-eyebrow">{t.eyebrow}</span>
          <h1>{DEFAULT_READING_TITLE}</h1>
          <span className="reading-subtitle">{t.subtitle}</span>
        </div>
      </div>

      <div className="reading-content-grid">
        <div className="reading-passage-card">
          <div className="reading-toolbar">
            <span>밑줄 친 단어를 누르면 뜻을 볼 수 있어요.</span>
            <button
              type="button"
              aria-pressed={showTranslation}
              onClick={() => setShowTranslation((current) => !current)}
              className={showTranslation ? 'reading-translation-toggle is-active' : 'reading-translation-toggle'}
            >
              {showTranslation ? t.translationHide : t.translationShow}
            </button>
          </div>

          {DEFAULT_READING_PARAGRAPHS.map((paragraph, paragraphIndex) => (
            <div className="reading-paragraph-block" key={`paragraph-${paragraphIndex}`}>
              <p className="reading-paragraph">
                {paragraph.map((segment, segmentIndex) => {
                  if (typeof segment === 'string') {
                    return <span key={`text-${paragraphIndex}-${segmentIndex}`}>{segment}</span>;
                  }

                  const word = segment[0];
                  const classNames = ['reading-word'];
                  if (selectedWordKey === word) classNames.push('is-selected');
                  if (saved[word]) classNames.push('is-saved');

                  return (
                    <span
                      key={`word-${paragraphIndex}-${segmentIndex}-${word}`}
                      className={classNames.join(' ')}
                      onClick={() => setSelectedWordKey(word)}
                    >
                      {word}
                    </span>
                  );
                })}
              </p>
              {showTranslation && (
                <p className="reading-translation">
                  {DEFAULT_READING_TRANSLATIONS[paragraphIndex]}
                </p>
              )}
            </div>
          ))}
        </div>

        <aside className="reading-aside">
          {selectedWord ? (
            <div className="reading-glossary-card">
              <span className="reading-pos">{selectedWord.pos[L]}</span>
              <span className="reading-word-base">{selectedWord.base}</span>
              <span className="reading-word-meaning">{selectedWord.en}</span>
              <span className="reading-word-example">{selectedWord.ex}</span>
              <div className="reading-glossary-actions">
                <button type="button" onClick={toggleSavedWord}>
                  {saved[selectedWordKey] ? t.saved : t.save}
                </button>
              </div>
            </div>
          ) : (
            <div className="reading-empty-card">
              <img src="/assets/캐릭터_훈이.png" alt="" />
              <span>{t.empty}</span>
            </div>
          )}

          <div className="reading-grammar-card">
            <span className="reading-grammar-heading">{t.grammarHeading}</span>
            {DEFAULT_READING_GRAMMAR.map((grammar) => (
              <span className="reading-grammar-item" key={grammar.form}>
                <b>{grammar.form}</b> — {grammar.explanation[L]}{' '}
                <span>{grammar.example}</span>
              </span>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default ReadingPage;
