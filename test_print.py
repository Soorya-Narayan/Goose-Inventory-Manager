from PIL import Image, ImageDraw, ImageFont
import subprocess

# Create 400x240 image (50mm x 30mm @ 203 dpi)
img = Image.new('1', (400, 240), 1) # monochrome white
draw = ImageDraw.Draw(img)

# Draw text
draw.text((20, 10), "GOOSE INVENTORY", fill=0)
draw.text((20, 35), "120 HP VFD PANEL", fill=0)

# Draw dummy barcode lines
x = 20
for w in [3,1,2,4,1,3,2,1,4,2,3,1,2,4,1,3,2,1,4,2,3,1,2,4,1,3,2,1,4,2,3,1,2,4]:
    draw.rectangle([x, 70, x+w, 170], fill=0)
    x += w + 2

draw.text((20, 180), "GIS-2608-4721", fill=0)
draw.text((20, 205), "LOC: SHELF A1", fill=0)

img.save("data/test_label.png")
print("Saved data/test_label.png")
