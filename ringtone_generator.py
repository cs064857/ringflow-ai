import os
import sys
import subprocess
import argparse
import re
from pathlib import Path
import yt_dlp

def parse_time_to_seconds(time_str: str) -> float:
    #將時分秒字串轉換為秒數浮點數
    if not time_str:
        return 0.0
    parts = time_str.strip().split(":")
    try:
        if len(parts) == 1:
            return float(parts[0])
        elif len(parts) == 2:
            return int(parts[0]) * 60 + float(parts[1])
        elif len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    except ValueError:
        raise ValueError(f"無法解析時間格式: {time_str}，請使用 '分:秒' 或秒數，例如 '01:25' 或 '85'")
    raise ValueError(f"不合法的時間格式: {time_str}")

def download_audio(url: str, output_dir: Path) -> Path:
    #使用yt-dlp下載最佳音軌並暫存為音訊檔加入客戶端模擬以防403
    output_template = str(output_dir / "download_temp.%(ext)s")
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "noplaylist": True,
        "quiet": False,
        "no_warnings": True,
        "extractor_args": {
            "youtube": {
                "player_client": ["android", "ios", "web"]
            }
        }
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
        downloaded_path = Path(filename)
        if not downloaded_path.exists():
            for f in output_dir.glob("download_temp.*"):
                return f
        return downloaded_path

def sanitize_filename(name: str) -> str:
    #移除檔名中不合法的特殊字元
    return re.sub(r'[\\/*?:"<>|]', "_", name).strip()

def process_ringtone(
    input_file: Path,
    output_dir: Path,
    base_name: str,
    start_time: float,
    duration: float = 29.5,
    fade_in: float = 1.0,
    fade_out: float = 2.0,
) -> tuple[Path, Path]:
    #使用ffmpeg裁切音訊加入淡入淡出並轉碼為m4r與m4a
    safe_name = sanitize_filename(base_name)
    m4a_path = output_dir / f"{safe_name}.m4a"
    m4r_path = output_dir / f"{safe_name}.m4r"

    fade_out_start = max(0.0, duration - fade_out)
    af_filters = []
    if fade_in > 0:
        af_filters.append(f"afade=t=in:ss=0:d={fade_in}")
    if fade_out > 0:
        af_filters.append(f"afade=t=out:st={fade_out_start}:d={fade_out}")

    af_filter_str = ",".join(af_filters) if af_filters else "anull"

    cmd = [
        "ffmpeg",
        "-y",
        "-ss", str(start_time),
        "-t", str(duration),
        "-i", str(input_file),
        "-af", af_filter_str,
        "-c:a", "aac",
        "-b:a", "256k",
        "-ar", "44100",
        "-ac", "2",
        str(m4a_path)
    ]

    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    if m4r_path.exists():
        m4r_path.unlink()
    #複製生成m4r鈴聲檔副檔名為m4r內部為AAC封裝
    m4a_path.replace(m4r_path)
    #同時保留m4a格式以方便GarageBand或AirDrop傳送
    import shutil
    shutil.copy2(m4r_path, m4a_path)

    return m4r_path, m4a_path

def main():
    parser = argparse.ArgumentParser(description="iPhone 鈴聲一條龍製作工具")
    parser.add_argument("-u", "--url", help="音訊/影片網址 (YouTube等) 或 本地檔案路徑")
    parser.add_argument("-s", "--start", default="0", help="開始時間 (例如 01:23 或 83 秒)")
    parser.add_argument("-d", "--duration", type=float, default=29.5, help="鈴聲長度(秒)，預設 29.5 秒 (上限建議 30 秒，最長勿超過 40 秒)")
    parser.add_argument("-n", "--name", default="MyRingtone", help="輸出檔名 (不含副檔名)")
    parser.add_argument("-o", "--output", default="output", help="輸出目錄")
    parser.add_argument("--fade-in", type=float, default=1.0, help="淡入秒數 (預設 1.0 秒)")
    parser.add_argument("--fade-out", type=float, default=2.0, help="淡出秒數 (預設 2.0 秒)")

    args = parser.parse_args()

    target = args.url
    if not target:
        print("=== iPhone 鈴聲一鍵製作小幫手 ===")
        target = input("請輸入 YouTube 網址或本機音訊檔案路徑: ").strip().strip('"\'')
        if not target:
            print("錯誤: 未提供來源網址或檔案！")
            sys.exit(1)

    start_input = args.start
    if not args.url:
        user_start = input(f"請輸入截取起點 [預設 {start_input}，如 01:20]: ").strip()
        if user_start:
            start_input = user_start

    start_sec = parse_time_to_seconds(start_input)

    duration = args.duration
    if not args.url:
        user_dur = input(f"請輸入鈴聲長度 (秒) [預設 {duration}，最大勿超過 39 秒]: ").strip()
        if user_dur:
            duration = float(user_dur)

    if duration > 39.5:
        print("警告: iPhone 來電鈴聲上限為 40 秒，超過可能無法同步或被強制截斷！")

    name = args.name
    if not args.url and name == "MyRingtone":
        user_name = input("請輸入鈴聲名稱 [預設 MyRingtone]: ").strip()
        if user_name:
            name = user_name

    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    input_path = None
    is_temp_download = False

    try:
        local_candidate = Path(target)
        if local_candidate.exists() and local_candidate.is_file():
            print(f"[1/3] 讀取本地檔案: {local_candidate}")
            input_path = local_candidate
        else:
            print(f"[1/3] 透過 yt-dlp 下載音訊中: {target}")
            input_path = download_audio(target, out_dir)
            is_temp_download = True

        print(f"[2/3] 正在使用 FFmpeg 裁切與轉碼 (起點: {start_sec}s, 長度: {duration}s)...")
        m4r_file, m4a_file = process_ringtone(
            input_file=input_path,
            output_dir=out_dir,
            base_name=name,
            start_time=start_sec,
            duration=duration,
            fade_in=args.fade_in,
            fade_out=args.fade_out
        )

        print(f"[3/3] 製作完成！已生成檔案：")
        print(f"  - iPhone 鈴聲檔 (.m4r): {m4r_file.resolve()}")
        print(f"  - 音訊檔 (.m4a，供 GarageBand/AirDrop 使用): {m4a_file.resolve()}")
        print("\n使用教學：")
        print("  方法 A (電腦 iTunes / Apple Devices / Finder):")
        print("    將 .m4r 檔案直接拖入已連接的 iPhone 鈴聲列表即可。")
        print("  方法 B (手機免電腦 GarageBand):")
        print("    將 .m4a 傳送到 iPhone 檔案 App，打開 GarageBand 匯入後分享為「鈴聲」即可。")

    except Exception as e:
        print(f"處理失敗: {e}")
        sys.exit(1)
    finally:
        if is_temp_download and input_path and input_path.exists():
            try:
                input_path.unlink()
            except Exception:
                pass

if __name__ == "__main__":
    main()
