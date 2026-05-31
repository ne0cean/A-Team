#!/usr/bin/env python3
"""음력→양력 자동 변환: yearly 항목 중 lunar 필드가 있는 것을 해당 연도 양력으로 갱신."""
import json, subprocess, sys
from korean_lunar_calendar import KoreanLunarCalendar

API = "https://cortex.feat-breeze.workers.dev"
YEAR = int(sys.argv[1]) if len(sys.argv) > 1 else __import__('datetime').date.today().year

def main():
    result = subprocess.run(['curl', '-s', f'{API}/api/standing-orders'], capture_output=True, text=True)
    d = json.loads(result.stdout, strict=False)
    yearly = d.get('yearly', [])
    cal = KoreanLunarCalendar()
    updated = 0

    for item in yearly:
        lunar = item.get('lunar')
        if not lunar:
            continue
        parts = lunar.split('-')
        if len(parts) != 2:
            continue
        lm, ld = int(parts[0]), int(parts[1])
        cal.setLunarDate(YEAR, lm, ld, False)
        solar = cal.SolarIsoFormat()  # YYYY-MM-DD
        sm, sd = int(solar.split('-')[1]), int(solar.split('-')[2])
        if item.get('month') != sm or item.get('day') != sd:
            print(f"  {item['text']}: 음력 {lm}/{ld} → {YEAR}-{sm:02d}-{sd:02d}")
            item['month'] = sm
            item['day'] = sd
            updated += 1

    if updated > 0:
        d['yearly'] = yearly
        payload = json.dumps(d, ensure_ascii=False)
        subprocess.run(['curl', '-s', '-X', 'POST', f'{API}/api/standing-orders',
                       '-H', 'Content-Type: application/json', '-d', payload],
                      capture_output=True)
        print(f"✓ {updated}개 음력 항목 → {YEAR}년 양력으로 갱신")
    else:
        print(f"변경 없음 ({YEAR}년 기준 이미 최신)")

if __name__ == '__main__':
    main()
