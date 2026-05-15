"""
gum wizard → PPT 생성 브리지
ppt-wizard.sh에서 호출됨

사용:
  python generate_via_intake.py \
    --topic "Q1 영업 성과 보고" \
    --ptype  보고형 \
    --audience 임원진 \
    --slides 10 \
    --theme dark_editorial
"""
import argparse, datetime, json, os, subprocess, sys

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
CONTENT_DIR = os.path.join(SCRIPT_DIR, "..", "..", "content", "ppt")

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--topic",    required=True)
    p.add_argument("--ptype",    default="보고형")
    p.add_argument("--audience", default="팀원")
    p.add_argument("--slides",   type=int, default=10)
    p.add_argument("--theme",    default="dark_editorial")
    p.add_argument("--data",     default="")
    args = p.parse_args()

    sys.path.insert(0, SCRIPT_DIR)
    from server import build_spec

    req  = dict(topic=args.topic, ptype=args.ptype, audience=args.audience,
                data=args.data, slides=args.slides, theme=args.theme)
    spec = build_spec(req)

    slug     = args.topic[:30].replace(" ", "-").replace("/", "-")
    date_str = datetime.date.today().isoformat()
    out_dir  = os.path.join(CONTENT_DIR, f"{date_str}-{slug}")
    os.makedirs(out_dir, exist_ok=True)

    spec_path = os.path.join(out_dir, "spec.json")
    with open(spec_path, "w", encoding="utf-8") as f:
        json.dump(spec, f, ensure_ascii=False, indent=2)

    out_pptx   = os.path.join(out_dir, f"{slug}.pptx")

    # Consulting 테마는 generate_consulting.py로 라우팅
    consulting_styles = {
        "consulting_mckinsey": "mckinsey",
        "consulting_bcg": "bcg",
        "consulting_bain": "bain",
    }
    consulting_style = consulting_styles.get(args.theme)

    if consulting_style:
        gen_script = os.path.join(SCRIPT_DIR, "generate_consulting.py")
        result = subprocess.run(
            [sys.executable, gen_script, spec_path,
             "--style", consulting_style, "--output", out_pptx],
            capture_output=True, text=True, timeout=60
        )
    else:
        gen_script = os.path.join(SCRIPT_DIR, "generate_v2.py")
        result = subprocess.run(
            [sys.executable, gen_script, spec_path,
             "--theme", args.theme, "--output", out_pptx],
            capture_output=True, text=True, timeout=60
        )

    if result.returncode == 0:
        print(f"\n  완료  {out_pptx}")
        print(f"  {len(spec['slides'])}장 / 테마: {args.theme}")
        try:
            os.startfile(os.path.dirname(out_pptx))
        except Exception:
            pass
    else:
        print("오류:\n" + (result.stderr or result.stdout), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
