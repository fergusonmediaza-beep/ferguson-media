import re, shutil
from pathlib import Path

EMAIL  = "info@fergusonmedia.co.za"
MAILTO = f"mailto:{EMAIL}"
FILES  = ["contact/index.html", "partner/index.html"]

P_HREF   = re.compile(r'href="/cdn-cgi/l/email-protection#[^"]*"')
P_SPAN   = re.compile(r'<span\s+class="__cf_email__"[^>]*>.*?</span>', re.DOTALL)
P_SCRIPT = re.compile(r'<script\s+data-cfasync="false"\s+src="/cdn-cgi/scripts/[^"]+/cloudflare-static/email-decode\.min\.js"[^>]*></script>')

def fix(src):
    src = P_HREF.sub(f'href="{MAILTO}"', src)
    src = P_SPAN.sub(EMAIL, src)
    src = P_SCRIPT.sub('', src)
    return src

for rel in FILES:
    path = Path(rel)
    if not path.exists():
        print(f"SKIP  {rel} (not found)"); continue
    original = path.read_text(encoding="utf-8")
    patched  = fix(original)
    if patched == original:
        print(f"CLEAN {rel} (nothing to change)"); continue
    shutil.copy2(path, path.with_suffix(".html.bak"))
    path.write_text(patched, encoding="utf-8")
    left = len(re.findall(r"cdn-cgi", patched    left = len(r'F    left = len(re.finde 'PARTIAL'} {rel}")

print("Done.")
