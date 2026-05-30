#!/usr/bin/env node
/**
 * Cortex JSON → Confluence Storage Format (XHTML) 변환기
 * 월별 캘린더, Standing Orders, Day Frames를 Confluence 페이지로 변환
 */

const CATEGORY_ICONS = {
  ritual: '\u2600\uFE0F',   // ☀️
  input: '\uD83D\uDCE5',    // 📥
  work: '\u26A1',            // ⚡
  outcome: '\uD83C\uDFAF',  // 🎯
  EX: '\uD83D\uDCAA',       // 💪
};

const CATEGORY_COLORS = {
  ritual: '#f0ad4e',
  input: '#5bc0de',
  work: '#d9534f',
  outcome: '#5cb85c',
  EX: '#8e44ad',
};

const DOW_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

let taskIdCounter = 1;

function resetTaskId() { taskIdCounter = 1; }
function nextTaskId() { return taskIdCounter++; }

function escapeXml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function makeTaskItem(text, done, url) {
  const status = done ? 'complete' : 'incomplete';
  const id = nextTaskId();
  const bodyText = url
    ? `<a href="${escapeXml(url)}">${escapeXml(text)}</a>`
    : escapeXml(text);
  return `<ac:task><ac:task-id>${id}</ac:task-id><ac:task-status>${status}</ac:task-status><ac:task-body><span class="placeholder-inline-tasks">${bodyText}</span></ac:task-body></ac:task>`;
}

function makeTaskList(items, categoryKey) {
  if (!items || items.length === 0) return '';
  const icon = CATEGORY_ICONS[categoryKey] || '';
  const color = CATEGORY_COLORS[categoryKey] || '#333';
  const tasks = items.map(item => {
    if (typeof item === 'string') {
      return makeTaskItem(item, false, '');
    }
    return makeTaskItem(item.text || '', item.done || false, item.url || '');
  }).join('\n');
  return `<p><strong><span style="color:${color}">${icon} ${escapeXml(categoryKey)}</span></strong></p>\n<ac:task-list>\n${tasks}\n</ac:task-list>`;
}

// ─── 월간 캘린더 ───

export function monthlyToConfluence(monthData, standingOrders) {
  resetTaskId();
  const { month, goals, days } = monthData;
  const [year, mon] = month.split('-').map(Number);

  // 이번 달의 공휴일/해피프라이데이
  const holidays = standingOrders?.holidays || {};

  let html = `<h1>${month}</h1>\n`;
  if (goals?.goal) {
    html += `<p><em>${escapeXml(goals.goal)}</em></p>\n`;
  }

  // 달력 테이블
  const firstDay = new Date(year, mon - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, mon, 0).getDate();

  html += `<table><colgroup>${'<col style="width:14.28%"/>'.repeat(7)}</colgroup>\n`;
  html += `<thead><tr>${DOW_NAMES.map(d => `<th style="text-align:center;background:#f5f5f5"><strong>${d}</strong></th>`).join('')}</tr></thead>\n`;
  html += '<tbody>\n';

  let dayNum = 1;
  const startOffset = firstDay; // 0=일요일 시작

  for (let week = 0; week < 6 && dayNum <= daysInMonth; week++) {
    html += '<tr>\n';
    for (let dow = 0; dow < 7; dow++) {
      const cellDay = week * 7 + dow - startOffset + 1;
      if (cellDay < 1 || cellDay > daysInMonth) {
        html += '<td style="vertical-align:top;background:#fafafa"></td>\n';
      } else {
        const dateStr = `${month}-${String(cellDay).padStart(2, '0')}`;
        const holiday = holidays[dateStr];
        const isHoliday = !!holiday;
        const bgColor = isHoliday ? '#fff8f0' : (dow === 0 ? '#fff0f0' : dow === 6 ? '#f0f5ff' : '#ffffff');
        const dayData = days?.[String(cellDay)] || {};

        let cellContent = `<p><strong>${cellDay}</strong>`;
        if (holiday) {
          cellContent += ` <span style="color:#e74c3c;font-size:11px">${escapeXml(holiday)}</span>`;
        }
        cellContent += '</p>\n';

        // 카테고리별 아이템
        for (const cat of ['ritual', 'input', 'work', 'outcome']) {
          const items = dayData[cat];
          if (items && items.length > 0) {
            cellContent += makeTaskList(items, cat) + '\n';
          }
        }
        // EX (운동)
        if (dayData.EX && dayData.EX.length > 0) {
          cellContent += makeTaskList(dayData.EX, 'EX') + '\n';
        }

        html += `<td style="vertical-align:top;background:${bgColor};min-width:120px" data-date="${cellDay}">\n${cellContent}</td>\n`;
      }
    }
    html += '</tr>\n';
  }

  html += '</tbody></table>\n';

  // 동기화 메타데이터 (숨김)
  html += `\n<ac:structured-macro ac:name="expand"><ac:parameter ac:name="title">sync-meta</ac:parameter><ac:rich-text-body><p>cortex-sync-ts:${new Date().toISOString()}</p></ac:rich-text-body></ac:structured-macro>`;

  return html;
}

// ─── Standing Orders ───

export function standingOrdersToConfluence(data) {
  resetTaskId();
  let html = '<h1>Standing Orders</h1>\n';

  // Vision
  if (data.vision) {
    html += `<ac:structured-macro ac:name="info"><ac:rich-text-body><p><strong>Vision:</strong> ${escapeXml(data.vision)}</p></ac:rich-text-body></ac:structured-macro>\n`;
  }

  // Standing (상시)
  if (data.standing?.length) {
    html += '<h2>Standing (상시)</h2>\n<ac:task-list>\n';
    for (const item of data.standing) {
      if (item.active !== false) {
        html += makeTaskItem(item.text, false, '') + '\n';
      }
    }
    html += '</ac:task-list>\n';
  }

  // Weekly Recurring
  if (data.weekly_recurring?.length) {
    html += '<h2>Weekly (주간)</h2>\n<table>\n';
    html += '<thead><tr><th>요일</th><th>주기</th><th>내용</th></tr></thead>\n<tbody>\n';
    for (const item of data.weekly_recurring) {
      const dowName = DOW_NAMES[item.dow] || item.dow;
      html += `<tr><td>${dowName}</td><td>${escapeXml(item.freq)}</td><td>${escapeXml(item.text)}</td></tr>\n`;
    }
    html += '</tbody></table>\n';
  }

  // Monthly (이번달/다음달)
  if (data.monthly) {
    html += '<h2>Monthly (월간)</h2>\n';
    for (const [monthKey, items] of Object.entries(data.monthly)) {
      html += `<h3>${escapeXml(monthKey)}</h3>\n<ul>\n`;
      for (const item of items) {
        html += `<li>${escapeXml(item)}</li>\n`;
      }
      html += '</ul>\n';
    }
  }

  // Monthly Recurring
  if (data.monthly_recurring?.length) {
    html += '<h2>Monthly Recurring (매월 반복)</h2>\n<table>\n';
    html += '<thead><tr><th>일</th><th>내용</th></tr></thead>\n<tbody>\n';
    for (const item of data.monthly_recurring) {
      const dayLabel = item.day === 0 ? '말일' : `${item.day}일`;
      html += `<tr><td>${dayLabel}</td><td>${escapeXml(item.text)}</td></tr>\n`;
    }
    html += '</tbody></table>\n';
  }

  // Yearly
  if (data.yearly?.length) {
    html += '<h2>Yearly (연간)</h2>\n<table>\n';
    html += '<thead><tr><th>월</th><th>내용</th></tr></thead>\n<tbody>\n';
    for (const item of data.yearly) {
      html += `<tr><td>${item.month}월</td><td>${escapeXml(item.text)}</td></tr>\n`;
    }
    html += '</tbody></table>\n';
  }

  // Input Backlog
  if (data.input_backlog?.length) {
    html += '<h2>Input Backlog</h2>\n<ac:task-list>\n';
    for (const item of data.input_backlog) {
      html += makeTaskItem(item.text, item.done || false, '') + '\n';
    }
    html += '</ac:task-list>\n';
  }

  // sync meta
  html += `\n<ac:structured-macro ac:name="expand"><ac:parameter ac:name="title">sync-meta</ac:parameter><ac:rich-text-body><p>cortex-sync-ts:${new Date().toISOString()}</p></ac:rich-text-body></ac:structured-macro>`;

  return html;
}

// ─── Day Frames ───

export function dayFramesToConfluence(data) {
  resetTaskId();
  let html = '<h1>Day Frames</h1>\n';

  for (const [frameKey, frame] of Object.entries(data)) {
    html += `<h2>${escapeXml(frame.label || frameKey)}</h2>\n`;

    for (const [catKey, catData] of Object.entries(frame.categories || {})) {
      const icon = CATEGORY_ICONS[catKey] || '';
      const color = CATEGORY_COLORS[catKey] || '#333';
      html += `<h3><span style="color:${color}">${icon} ${escapeXml(catKey)}</span> <em>(${escapeXml(catData.type || 'todo')})</em></h3>\n`;

      if (catData.items?.length) {
        html += '<ul>\n';
        for (const item of catData.items) {
          html += `<li>${escapeXml(item)}</li>\n`;
        }
        html += '</ul>\n';
      } else {
        html += '<p><em>(비어 있음)</em></p>\n';
      }
    }
    html += '<hr/>\n';
  }

  // sync meta
  html += `\n<ac:structured-macro ac:name="expand"><ac:parameter ac:name="title">sync-meta</ac:parameter><ac:rich-text-body><p>cortex-sync-ts:${new Date().toISOString()}</p></ac:rich-text-body></ac:structured-macro>`;

  return html;
}

// ─── CLI ───

import { readFileSync } from 'fs';
import { resolve } from 'path';

const DATA_DIR = resolve(import.meta.dirname, '../../cortex/data/ritual-routine');

function main() {
  const target = process.argv[2] || 'all'; // calendar | standing | frames | all
  const monthArg = process.argv[3]; // e.g. 2026-06

  if (target === 'calendar' || target === 'all') {
    const month = monthArg || new Date().toISOString().slice(0, 7);
    const monthFile = resolve(DATA_DIR, `${month}.json`);
    const soFile = resolve(DATA_DIR, 'standing-orders.json');
    const monthData = JSON.parse(readFileSync(monthFile, 'utf-8'));
    const soData = JSON.parse(readFileSync(soFile, 'utf-8'));
    const html = monthlyToConfluence(monthData, soData);
    if (target === 'calendar') {
      process.stdout.write(html);
    } else {
      console.log(`--- Calendar ${month} (${html.length} chars) ---`);
    }
  }

  if (target === 'standing' || target === 'all') {
    const soFile = resolve(DATA_DIR, 'standing-orders.json');
    const soData = JSON.parse(readFileSync(soFile, 'utf-8'));
    const html = standingOrdersToConfluence(soData);
    if (target === 'standing') {
      process.stdout.write(html);
    } else {
      console.log(`--- Standing Orders (${html.length} chars) ---`);
    }
  }

  if (target === 'frames' || target === 'all') {
    const framesFile = resolve(DATA_DIR, 'day-frames.json');
    const framesData = JSON.parse(readFileSync(framesFile, 'utf-8'));
    const html = dayFramesToConfluence(framesData);
    if (target === 'frames') {
      process.stdout.write(html);
    } else {
      console.log(`--- Day Frames (${html.length} chars) ---`);
    }
  }
}

main();
