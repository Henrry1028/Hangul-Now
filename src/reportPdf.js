// ============================================================
// Survival Korean — 복습 노트 PDF 생성 (서버 사이드)
// Live 소켓에서 모은 대화 로그(STT 비용 0원) + Kiwi 형태소 분석
// + gemini-3.8-flash 첨삭 결과를 합쳐 한글이 깨지지 않는 PDF를 만든다.
// 한글 폰트(Noto Sans KR)를 PDF에 내장하므로 뷰어 환경과 무관하게 동일하게 보인다.
// ============================================================

import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_PATH = path.join(__dirname, "..", "assets", "fonts", "NotoSansKR.ttf");

const C = {
  ink: "#1C1F1E", sub: "#66645D", faint: "#8A877E",
  accent: "#23493F", hot: "#C8502A", line: "#E4DFD4", chipBg: "#F1EDE4", hintBg: "#FBF3EE"
};

const pad = (n) => String(n).padStart(2, "0");
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

/**
 * 복습 노트 PDF를 Buffer로 만든다.
 * @param {object} p
 * @param {Array}  p.turns    [{role:'user'|'tutor', text, at}]
 * @param {Array}  p.hints    [{error_phrase, corrected_phrase, situation_rule, romanization, at}]
 * @param {Array}  p.morphs   [{sentence, items:[{surface,tag,role}]}]  Kiwi 형태소 분석
 * @param {object} p.review   {summary, corrections:[{before,after,why}], vocabulary:[{word,meaning}], nextSteps:[]}
 * @param {object} p.meta     {scenarioTitle, level, startedAt, endedAt, userName}
 */
export function buildReviewPdf({ turns = [], hints = [], morphs = [], review = null, meta = {} }) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(FONT_PATH)) {
        return reject(new Error(`한글 폰트를 찾을 수 없습니다: ${FONT_PATH}`));
      }
      const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true, info: { Title: "Survival Korean 복습 노트" } });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // 한글 폰트 내장 — 이것이 있어야 한글이 깨지지 않는다
      doc.registerFont("kr", FONT_PATH);
      doc.font("kr");

      const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const L = doc.page.margins.left;

      const heading = (text, sizeNum = 13) => {
        if (doc.y > doc.page.height - 140) doc.addPage().font("kr");
        doc.moveDown(0.9);
        // x를 항상 왼쪽 여백으로 되돌린다 (앞선 박스 그리기로 x가 옮겨져 있을 수 있음)
        doc.fontSize(sizeNum).fillColor(C.accent).text(text, L, doc.y, { width: W, align: "left" });
        doc.moveTo(L, doc.y + 3).lineTo(L + W, doc.y + 3).strokeColor(C.line).lineWidth(1).stroke();
        doc.moveDown(0.6);
      };
      const body = (text, opts = {}) =>
        doc.fontSize(opts.size || 10.5).fillColor(opts.color || C.ink).text(text, L, doc.y, { width: W, ...opts });
      const ensure = (h) => { if (doc.y > doc.page.height - h) doc.addPage().font("kr"); };

      // ── 표지 머리말 ─────────────────────────────────
      doc.fontSize(22).fillColor(C.ink).text("Survival Korean 복습 노트");
      doc.moveDown(0.25);
      doc.fontSize(10.5).fillColor(C.faint)
        .text(`${meta.scenarioTitle || "롤플레잉"} · ${meta.level || "초급"}${meta.userName ? " · " + meta.userName : ""}`);
      doc.fontSize(9.5).fillColor(C.faint)
        .text(`${meta.startedAt ? fmtDate(new Date(meta.startedAt)) : fmtDate(new Date())} 생성`);
      doc.moveDown(0.6);
      doc.moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor(C.accent).lineWidth(2).stroke();

      // ── 요약 수치 ───────────────────────────────────
      doc.moveDown(0.8);
      const myTurns = turns.filter((t) => t.role === "user").length;
      const stats = [
        ["주고받은 대화", `${turns.length}회`],
        ["내가 말한 횟수", `${myTurns}회`],
        ["치명적 오류", `${hints.length}건`]
      ];
      const bw = W / stats.length;
      const sy = doc.y;
      stats.forEach(([label, value], i) => {
        const x = L + bw * i;
        doc.roundedRect(x + 2, sy, bw - 4, 46, 6).fillColor(C.chipBg).fill();
        doc.fillColor(C.sub).fontSize(9).text(label, x + 12, sy + 9, { width: bw - 24 });
        doc.fillColor(C.ink).fontSize(15).text(value, x + 12, sy + 22, { width: bw - 24 });
      });
      doc.y = sy + 56;

      // ── 1. 치명적 오류 카드 ─────────────────────────
      heading("1. 오늘 꼭 고쳐야 할 표현");
      if (!hints.length) {
        body("이번 대화에서는 거래를 막는 치명적인 오류가 없었어요. 아주 잘하셨어요!", { color: C.sub });
      } else {
        hints.forEach((h, i) => {
          ensure(120);
          const top = doc.y;
          doc.fontSize(10).fillColor(C.hot).text(`오류 ${i + 1}`, L + 12, top + 10, { width: W - 24 });
          doc.fontSize(12).fillColor(C.ink)
            .text(`X  ${h.error_phrase}   →   O  ${h.corrected_phrase}`, L + 12, doc.y + 2, { width: W - 24 });
          if (h.romanization) doc.fontSize(9.5).fillColor(C.faint).text(`[${h.romanization}]`, L + 12, doc.y + 1, { width: W - 24 });
          doc.fontSize(10).fillColor(C.sub).text(h.situation_rule, L + 12, doc.y + 3, { width: W - 24 });
          const bottom = doc.y + 10;
          doc.roundedRect(L, top, W, bottom - top, 8).strokeColor(C.hot).lineWidth(1).stroke();
          doc.y = bottom + 8;
        });
      }

      // ── 2. 대화 전문 ────────────────────────────────
      heading("2. 대화 전문");
      if (!turns.length) body("기록된 대화가 없습니다.", { color: C.sub });
      turns.forEach((t) => {
        ensure(60);
        const who = t.role === "user" ? "나" : (meta.partnerName || "상대");
        const time = t.at ? fmtTime(new Date(t.at)) : "";
        doc.fontSize(9).fillColor(t.role === "user" ? C.accent : C.faint).text(`${who}  ${time}`, L, doc.y, { width: W });
        doc.fontSize(10.5).fillColor(C.ink).text(t.text, L, doc.y, { width: W, indent: 8 });
        doc.moveDown(0.35);
      });

      // ── 3. Kiwi 형태소 분석 ─────────────────────────
      if (morphs.length) {
        heading("3. 내 문장 형태소 분석 (Kiwi)");
        morphs.forEach((m) => {
          ensure(70);
          doc.fontSize(10.5).fillColor(C.ink).text(m.sentence, L, doc.y, { width: W });
          const line = (m.items || []).map((it) => `${it.surface}/${it.tag}`).join("   ");
          if (line) doc.fontSize(9).fillColor(C.sub).text(line, L, doc.y, { width: W, indent: 8 });
          doc.moveDown(0.45);
        });
      }

      // ── 4. 첨삭 (gemini-3.8-flash) ──────────────────
      if (review) {
        heading("4. 선생님 첨삭");
        if (review.summary) { body(review.summary, { color: C.ink }); doc.moveDown(0.5); }
        if (review.corrections?.length) {
          doc.fontSize(11).fillColor(C.accent).text("문장 다듬기"); doc.moveDown(0.3);
          review.corrections.forEach((c) => {
            ensure(60);
            doc.fontSize(10).fillColor(C.faint).text(`전) ${c.before}`, { width: W, indent: 8 });
            doc.fontSize(10.5).fillColor(C.ink).text(`후) ${c.after}`, { width: W, indent: 8 });
            if (c.why) doc.fontSize(9.5).fillColor(C.sub).text(`→ ${c.why}`, { width: W, indent: 8 });
            doc.moveDown(0.4);
          });
        }
        if (review.vocabulary?.length) {
          ensure(90);
          doc.moveDown(0.3);
          doc.fontSize(11).fillColor(C.accent).text("오늘의 단어"); doc.moveDown(0.3);
          review.vocabulary.forEach((v) => {
            ensure(30);
            doc.fontSize(10.5).fillColor(C.ink).text(`${v.word}`, { continued: true, indent: 8 })
              .fillColor(C.sub).fontSize(10).text(`  —  ${v.meaning}`);
          });
        }
        if (review.nextSteps?.length) {
          ensure(90);
          doc.moveDown(0.5);
          doc.fontSize(11).fillColor(C.accent).text("다음에 연습할 것"); doc.moveDown(0.3);
          review.nextSteps.forEach((s, i) => {
            ensure(28);
            doc.fontSize(10.5).fillColor(C.ink).text(`${i + 1}. ${s}`, { width: W, indent: 8 });
          });
        }
      }

      // ── 쪽 번호 ─────────────────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.font("kr").fontSize(8.5).fillColor(C.faint)
          .text(`Survival Korean · ${i - range.start + 1} / ${range.count}`,
            L, doc.page.height - 38, { width: W, align: "center" });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export const REPORT_FONT_PATH = FONT_PATH;
