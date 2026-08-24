import sys
import json
from PIL import Image, ImageDraw, ImageFont

# Code 128 B Character Table (Patterns: 6 elements representing bar/space widths)
CODE128_PATTERNS = [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
    "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
    "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
    "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
    "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
    "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
    "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
    "313112", "331121", "312113", "312311", "332111", "314111", "221411", "431111",
    "111224", "111422", "121124", "121421", "141122", "141221", "112214", "112412",
    "122114", "122411", "142112", "142211", "241211", "221114", "411112", "134111",
    "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
    "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
    "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
    "211214", "211232", "2331112"
]

START_CODE_B = 104
STOP_CODE = 106

def encode_code128_b(text):
    indices = [START_CODE_B]
    checksum = START_CODE_B
    for i, char in enumerate(text):
        val = ord(char) - 32
        if 0 <= val <= 94:
            indices.append(val)
            checksum += val * (i + 1)
        else:
            indices.append(31) # fallback
            checksum += 31 * (i + 1)
            
    checksum = checksum % 103
    indices.append(checksum)
    indices.append(STOP_CODE)
    
    pattern_str = "".join(CODE128_PATTERNS[idx] for idx in indices)
    return pattern_str

def create_sticker_image(name, sku, location="A1", zone="General", width=400, height=240):
    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)
    
    # 1. Header Line
    draw.text((15, 8), "GOOSE INDUSTRIAL SYSTEMS", fill=(40, 40, 40))
    draw.line([(15, 26), (width - 15, 26)], fill=(180, 180, 180), width=1)
    
    # 2. Material Name (Truncated if long)
    disp_name = name[:26] + "..." if len(name) > 28 else name
    draw.text((15, 32), disp_name.upper(), fill=(0, 0, 0))
    
    # 3. Barcode Generation
    code_pattern = encode_code128_b(sku)
    total_modules = sum(int(c) for c in code_pattern)
    
    module_width = 2
    barcode_w = total_modules * module_width
    start_x = max(15, (width - barcode_w) // 2)
    start_y = 62
    barcode_h = 78
    
    is_bar = True
    curr_x = start_x
    for ch in code_pattern:
        w = int(ch) * module_width
        if is_bar:
            draw.rectangle([curr_x, start_y, curr_x + w - 1, start_y + barcode_h], fill=(0, 0, 0))
        curr_x += w
        is_bar = not is_bar
        
    # 4. Barcode SKU Text (Centered)
    draw.text((start_x + (barcode_w // 2) - (len(sku) * 4), start_y + barcode_h + 4), sku, fill=(0, 0, 0))
    
    # 5. Bottom Info Line
    draw.line([(15, height - 32), (width - 15, height - 32)], fill=(180, 180, 180), width=1)
    draw.text((15, height - 26), f"LOC: {location}", fill=(0, 0, 0))
    draw.text((width - 140, height - 26), f"ZONE: {zone[:10].upper()}", fill=(0, 0, 0))
    
    return img

if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "120 HP VFD PANEL"
    sku  = sys.argv[2] if len(sys.argv) > 2 else "GIS-2608-4721"
    loc  = sys.argv[3] if len(sys.argv) > 3 else "SHELF A1"
    zone = sys.argv[4] if len(sys.argv) > 4 else "ELECTRICAL"
    
    img = create_sticker_image(name, sku, loc, zone)
    out_path = "/tmp/sticker_test.png"
    img.save(out_path)
    print(f"Generated sticker image at {out_path}")
