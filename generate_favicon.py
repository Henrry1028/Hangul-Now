import os
import shutil
from PIL import Image

def generate_favicons():
    source_path = "투명 배경의 행글 나우 아이콘.png"
    if not os.path.exists(source_path):
        raise FileNotFoundError(f"원본 이미지를 찾을 수 없습니다: {source_path}")

    # 원본 이미지 로드
    original = Image.open(source_path).convert("RGBA")
    
    # 투명 영역을 기준으로 유효 컨텐츠 경계(BBox) 검출 및 크롭
    bbox = original.getbbox()
    if bbox:
        cropped = original.crop(bbox)
    else:
        cropped = original

    # 정사각형 캔버스 생성 (약 5% 여백을 주어 모서리 잘림 방지 및 시각적 안정감 확보)
    cw, ch = cropped.size
    max_dim = max(cw, ch)
    
    # 캔버스 크기는 내용물 크기 대비 약 1.08배 (상하좌우 약 4% 여백)
    canvas_dim = int(max_dim * 1.08)
    master_canvas = Image.new("RGBA", (canvas_dim, canvas_dim), (0, 0, 0, 0))
    offset_x = (canvas_dim - cw) // 2
    offset_y = (canvas_dim - ch) // 2
    master_canvas.paste(cropped, (offset_x, offset_y), cropped)

    # 생성할 디렉터리 목록
    dirs = [
        ".",                       # 루트 디렉터리
        "preview",                 # 웹 프리뷰 루트 (express.static 대상)
        "assets",                  # 프로젝트 공용 에셋
        os.path.join("preview", "assets")  # 프리뷰 에셋
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

    # 1. 다중 해상도 ICO 생성 (16, 32, 48, 64)
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    ico_images = [
        master_canvas.resize(s, Image.Resampling.LANCZOS)
        for s in ico_sizes
    ]
    
    # 루트와 preview에 favicon.ico 저장
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
    for target_dir in ["preview", "assets", os.path.join("preview", "assets")]:
        for fname in generated_files:
            dest = os.path.join(target_dir, fname)
            shutil.copy2(fname, dest)
        print(f"복사 완료 -> {target_dir}")

    print("\n모든 파비콘 에셋이 성공적으로 생성 및 배치되었습니다!")

if __name__ == "__main__":
    generate_favicons()
