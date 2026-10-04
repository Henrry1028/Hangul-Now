import os
import shutil
from PIL import Image

def generate_favicons():
    source_path = "투명 배경의 행글 나우 아이콘.png"
    if not os.path.exists(source_path):
        raise FileNotFoundError(f"원본 이미지를 찾을 수 없습니다: {source_path}")

    # 원본 이미지 로드
    original = Image.open(source_path).convert("RGBA")
    
    # 알파값 기반 유효 컨텐츠 경계 검출 (노이즈 방지)
    import numpy as np
    arr = np.array(original)
    alpha = arr[:, :, 3]
    y_idx, x_idx = np.where(alpha > 20)
    if len(x_idx) > 0 and len(y_idx) > 0:
        x1, y1, x2, y2 = int(x_idx.min()), int(y_idx.min()), int(x_idx.max()), int(y_idx.max())
        cropped = original.crop((x1, y1, x2 + 1, y2 + 1))
    else:
        cropped = original

    # 정사각형 캔버스에 100% 꽉 채워 생성 (브라우저 탭에서 작게 축소되어 보이는 현상 방지)
    cw, ch = cropped.size
    max_dim = max(cw, ch)
    master_canvas = Image.new("RGBA", (max_dim, max_dim), (0, 0, 0, 0))
    offset_x = (max_dim - cw) // 2
    offset_y = (max_dim - ch) // 2
    master_canvas.paste(cropped, (offset_x, offset_y), cropped)

    # 생성할 디렉터리 목록
    dirs = [
        ".",                       # 루트 디렉터리
        "frontend/public",         # React/Vite 프론트엔드 퍼블릭 디렉터리
        "preview",                 # 웹 프리뷰 루트
        "assets",                  # 프로젝트 공용 에셋
        os.path.join("preview", "assets")
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

    # 1. 다중 해상도 ICO 생성 (16, 32, 48, 64)
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    
    # 루트에 favicon.ico 임시 저장
    master_canvas.save("favicon.ico", format="ICO", sizes=ico_sizes)
    print("생성 완료: ./favicon.ico")

    # 2. 개별 해상도 PNG 파일 생성
    png_targets = {
        "favicon-16x16.png": (16, 16),
        "favicon-32x32.png": (32, 32),
        "favicon-48x48.png": (48, 48),
        "apple-touch-icon.png": (180, 180),
        "android-chrome-192x192.png": (192, 192),
        "android-chrome-512x512.png": (512, 512),
        "favicon.png": (32, 32)
    }

    generated_files = ["favicon.ico"]
    for filename, size in png_targets.items():
        resized = master_canvas.resize(size, Image.Resampling.LANCZOS)
        resized.save(filename, format="PNG", optimize=True)
        generated_files.append(filename)
        print(f"생성 완료: ./{filename} ({size[0]}x{size[1]})")

    # 대상 디렉터리로 복사
    for target_dir in ["frontend/public", "preview", "assets", os.path.join("preview", "assets"), "frontend/dist"]:
        if os.path.exists(target_dir):
            for fname in generated_files:
                dest = os.path.join(target_dir, fname)
                shutil.copy2(fname, dest)
            print(f"복사 완료 -> {target_dir}")

    print("\n모든 파비콘 에셋이 성공적으로 생성 및 배치되었습니다!")

if __name__ == "__main__":
    generate_favicons()
