"""
prepare_dataset.py
-------------------
Converts two raw sources into one merged YOLO-format detection dataset:

  1. RDD2022 India subset   (Pascal VOC XML annotations)
  2. TACO (Trash Annotations in Context)   (COCO JSON annotations)

Output classes (final, used by the trained model):
  0 = POTHOLE      <- RDD2022 class D40
  1 = ROAD_CRACK    <- RDD2022 classes D00, D10, D20  (merged: too few
                        examples individually to train separately)
  2 = GARBAGE       <- selected TACO litter supercategories

RDD2022 classes NOT used (too rare in this subset to be trainable, and/or
out of scope for the CivicSense MVP): D44, D01, D50, D11, D43.
Any bounding box with one of these labels is dropped, but the image is
still kept if it has at least one usable box.

Usage:
    python prepare_dataset.py --stage rdd     # convert RDD2022 only
    python prepare_dataset.py --stage taco    # convert TACO only
    python prepare_dataset.py --stage merge   # merge + stratified split
    python prepare_dataset.py --stage all     # do everything

Expected raw layout (adjust RDD_DIR / TACO_DIR below if yours differs):

  data_prep/raw/rdd2022_india/train/images/*.jpg
  data_prep/raw/rdd2022_india/train/annotations/xmls/*.xml

  data_prep/raw/taco/images/**/*.jpg      (TACO's own batch_1/, batch_2/... folders)
  data_prep/raw/taco/annotations.json     (single COCO file covering all images)

Output:
  data_prep/output/images/{train,val,test}/*.jpg
  data_prep/output/labels/{train,val,test}/*.txt
  data_prep/output/dataset.yaml
  data_prep/output/prep_report.json       <- counts, for your README/evaluation writeup
"""

import argparse
import json
import random
import shutil
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------

BASE = Path(__file__).parent
RDD_DIR = BASE / "raw" / "rdd2022_india" / "train"
TACO_DIR = BASE / "raw" / "taco"
OUT_DIR = BASE / "output"

FINAL_CLASSES = ["POTHOLE", "ROAD_CRACK", "GARBAGE"]
CLASS_ID = {name: i for i, name in enumerate(FINAL_CLASSES)}

# RDD2022 raw label -> final class. Anything not listed here is dropped.
RDD_LABEL_MAP = {
    "D40": "POTHOLE",
    "D00": "ROAD_CRACK",
    "D10": "ROAD_CRACK",
    "D20": "ROAD_CRACK",
    # D44, D01, D50, D11, D43 intentionally omitted -> dropped
}

# TACO supercategories that map to our single GARBAGE class.
# TACO's full taxonomy has ~60 categories under ~28 supercategories; we only
# want ones that are visually "litter on ground/road", not e.g. "Battery"
# or category noise that would confuse a road-litter detector.
TACO_SUPERCATEGORIES_KEEP = {
    "Bottle",
    "Bottle cap",
    "Can",
    "Carton",
    "Cup",
    "Food waste",
    "Paper",
    "Plastic bag & wrapper",
    "Plastic container",
    "Straw",
    "Styrofoam piece",
    "Unlabeled litter",
}

RANDOM_SEED = 42
SPLIT_RATIOS = {"train": 0.8, "val": 0.1, "test": 0.1}


# ----------------------------------------------------------------------------
# Shared helpers
# ----------------------------------------------------------------------------

def yolo_line(class_id, x, y, w, h, img_w, img_h):
    """Convert absolute pixel box [x,y,w,h] (top-left origin) to a YOLO line."""
    cx = (x + w / 2) / img_w
    cy = (y + h / 2) / img_h
    nw = w / img_w
    nh = h / img_h
    # clamp — some source annotations have boxes that touch/exceed the edge
    cx, cy, nw, nh = (max(0.0, min(1.0, v)) for v in (cx, cy, nw, nh))
    return f"{class_id} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}"


# ----------------------------------------------------------------------------
# Stage 1: RDD2022 (VOC XML) -> intermediate YOLO labels
# ----------------------------------------------------------------------------

def convert_rdd():
    img_dir = RDD_DIR / "images"
    ann_dir = RDD_DIR / "annotations" / "xmls"
    if not img_dir.exists():
        print(f"[rdd] SKIP — not found at {img_dir}")
        return [], Counter()

    staging_img = OUT_DIR / "_staging_rdd" / "images"
    staging_lbl = OUT_DIR / "_staging_rdd" / "labels"
    staging_img.mkdir(parents=True, exist_ok=True)
    staging_lbl.mkdir(parents=True, exist_ok=True)

    kept_images = []
    dropped_label_counts = Counter()
    kept_label_counts = Counter()
    images_with_no_usable_box = 0

    for xml_path in sorted(ann_dir.glob("*.xml")):
        tree = ET.parse(xml_path)
        root = tree.getroot()

        size = root.find("size")
        img_w = int(size.find("width").text)
        img_h = int(size.find("height").text)

        lines = []
        for obj in root.findall("object"):
            raw_label = obj.find("name").text
            if raw_label not in RDD_LABEL_MAP:
                dropped_label_counts[raw_label] += 1
                continue
            final_label = RDD_LABEL_MAP[raw_label]
            kept_label_counts[final_label] += 1

            bnd = obj.find("bndbox")
            xmin = float(bnd.find("xmin").text)
            ymin = float(bnd.find("ymin").text)
            xmax = float(bnd.find("xmax").text)
            ymax = float(bnd.find("ymax").text)
            w = xmax - xmin
            h = ymax - ymin
            lines.append(yolo_line(CLASS_ID[final_label], xmin, ymin, w, h, img_w, img_h))

        if not lines:
            images_with_no_usable_box += 1
            continue  # skip images where every box got dropped

        stem = xml_path.stem
        src_img = img_dir / f"{stem}.jpg"
        if not src_img.exists():
            print(f"[rdd] WARNING — missing image for {stem}, skipping")
            continue

        shutil.copy(src_img, staging_img / f"rdd_{stem}.jpg")
        (staging_lbl / f"rdd_{stem}.txt").write_text("\n".join(lines) + "\n")
        kept_images.append(f"rdd_{stem}")

    print(f"[rdd] kept {len(kept_images)} images "
          f"(dropped {images_with_no_usable_box} with no usable box)")
    print(f"[rdd] kept boxes by class: {dict(kept_label_counts)}")
    print(f"[rdd] dropped boxes by raw label: {dict(dropped_label_counts)}")

    return kept_images, kept_label_counts


# ----------------------------------------------------------------------------
# Stage 2: TACO (COCO JSON) -> intermediate YOLO labels
# ----------------------------------------------------------------------------

def convert_taco():
    ann_file = TACO_DIR / "annotations.json"
    if not ann_file.exists():
        print(f"[taco] SKIP — {ann_file} not found.")
        print("[taco]   -> Download TACO in a Kaggle/Colab notebook, not locally "
              "(see chat notes: filter annotations.json to TACO_SUPERCATEGORIES_KEEP "
              "BEFORE pulling images, so you only fetch what you need).")
        return [], Counter()

    coco = json.loads(ann_file.read_text())

    cat_id_to_supercat = {c["id"]: c["supercategory"] for c in coco["categories"]}
    keep_cat_ids = {
        cid for cid, supercat in cat_id_to_supercat.items()
        if supercat in TACO_SUPERCATEGORIES_KEEP
    }

    images_by_id = {img["id"]: img for img in coco["images"]}
    anns_by_image = defaultdict(list)
    for ann in coco["annotations"]:
        if ann["category_id"] in keep_cat_ids:
            anns_by_image[ann["image_id"]].append(ann)

    staging_img = OUT_DIR / "_staging_taco" / "images"
    staging_lbl = OUT_DIR / "_staging_taco" / "labels"
    staging_img.mkdir(parents=True, exist_ok=True)
    staging_lbl.mkdir(parents=True, exist_ok=True)

    kept_images = []
    kept_label_counts = Counter()

    for image_id, anns in anns_by_image.items():
        img_info = images_by_id[image_id]
        img_w, img_h = img_info["width"], img_info["height"]
        src_img = TACO_DIR / img_info["file_name"]  # e.g. "batch_3/000027.jpg"
        if not src_img.exists():
            continue

        lines = []
        for ann in anns:
            x, y, w, h = ann["bbox"]  # COCO format: top-left x,y + width,height
            lines.append(yolo_line(CLASS_ID["GARBAGE"], x, y, w, h, img_w, img_h))
            kept_label_counts["GARBAGE"] += 1

        stem = Path(img_info["file_name"]).stem
        safe_name = f"taco_{image_id}_{stem}"
        shutil.copy(src_img, staging_img / f"{safe_name}.jpg")
        (staging_lbl / f"{safe_name}.txt").write_text("\n".join(lines) + "\n")
        kept_images.append(safe_name)

    print(f"[taco] kept {len(kept_images)} images, {kept_label_counts['GARBAGE']} boxes")
    return kept_images, kept_label_counts


# ----------------------------------------------------------------------------
# Stage 3: merge both sources + stratified train/val/test split
# ----------------------------------------------------------------------------

def dominant_class_of(label_file: Path):
    """Used only to stratify the split — the class with the most boxes in
    that image. Doesn't affect training, just keeps val/test balanced."""
    counts = Counter()
    for line in label_file.read_text().splitlines():
        if line.strip():
            counts[int(line.split()[0])] += 1
    return counts.most_common(1)[0][0] if counts else -1


def merge_and_split():
    random.seed(RANDOM_SEED)

    all_items = []  # list of (name, staging_images_dir, staging_labels_dir)
    for staging_name in ("_staging_rdd", "_staging_taco"):
        img_dir = OUT_DIR / staging_name / "images"
        lbl_dir = OUT_DIR / staging_name / "labels"
        if not img_dir.exists():
            continue
        for img_path in img_dir.glob("*.jpg"):
            all_items.append((img_path.stem, img_dir, lbl_dir))

    if not all_items:
        print("[merge] Nothing to merge — run --stage rdd and/or --stage taco first.")
        return

    # group by dominant class so each split gets a proportional mix
    by_class = defaultdict(list)
    for name, img_dir, lbl_dir in all_items:
        cls = dominant_class_of(lbl_dir / f"{name}.txt")
        by_class[cls].append((name, img_dir, lbl_dir))

    for cls_items in by_class.values():
        random.shuffle(cls_items)

    split_assignment = {}  # name -> split
    for cls, items in by_class.items():
        n = len(items)
        n_train = int(n * SPLIT_RATIOS["train"])
        n_val = int(n * SPLIT_RATIOS["val"])
        for i, (name, _, _) in enumerate(items):
            if i < n_train:
                split_assignment[name] = "train"
            elif i < n_train + n_val:
                split_assignment[name] = "val"
            else:
                split_assignment[name] = "test"

    split_counts = Counter()
    class_counts_per_split = defaultdict(Counter)

    for name, img_dir, lbl_dir in all_items:
        split = split_assignment[name]
        split_counts[split] += 1

        dst_img_dir = OUT_DIR / "images" / split
        dst_lbl_dir = OUT_DIR / "labels" / split
        dst_img_dir.mkdir(parents=True, exist_ok=True)
        dst_lbl_dir.mkdir(parents=True, exist_ok=True)

        shutil.copy(img_dir / f"{name}.jpg", dst_img_dir / f"{name}.jpg")
        shutil.copy(lbl_dir / f"{name}.txt", dst_lbl_dir / f"{name}.txt")

        for line in (lbl_dir / f"{name}.txt").read_text().splitlines():
            if line.strip():
                cls_id = int(line.split()[0])
                class_counts_per_split[split][FINAL_CLASSES[cls_id]] += 1

    # cleanup staging
    for staging_name in ("_staging_rdd", "_staging_taco"):
        staging_path = OUT_DIR / staging_name
        if staging_path.exists():
            shutil.rmtree(staging_path)

    # dataset.yaml for YOLO training
    yaml_content = (
        f"# Auto-generated by prepare_dataset.py\n"
        f"path: {OUT_DIR.resolve()}\n"
        f"train: images/train\n"
        f"val: images/val\n"
        f"test: images/test\n"
        f"names:\n"
        + "\n".join(f"  {i}: {name}" for i, name in enumerate(FINAL_CLASSES))
        + "\n"
    )
    (OUT_DIR / "dataset.yaml").write_text(yaml_content)

    report = {
        "total_images": sum(split_counts.values()),
        "images_per_split": dict(split_counts),
        "boxes_per_class_per_split": {
            split: dict(counts) for split, counts in class_counts_per_split.items()
        },
        "classes": FINAL_CLASSES,
        "random_seed": RANDOM_SEED,
    }
    (OUT_DIR / "prep_report.json").write_text(json.dumps(report, indent=2))

    print("\n[merge] DONE")
    print(f"[merge] images per split: {dict(split_counts)}")
    for split, counts in class_counts_per_split.items():
        print(f"[merge] boxes in {split}: {dict(counts)}")
    print(f"[merge] wrote {OUT_DIR / 'dataset.yaml'}")
    print(f"[merge] wrote {OUT_DIR / 'prep_report.json'}")


# ----------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--stage", choices=["rdd", "taco", "merge", "all"], default="all"
    )
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if args.stage in ("rdd", "all"):
        convert_rdd()
    if args.stage in ("taco", "all"):
        convert_taco()
    if args.stage in ("merge", "all"):
        merge_and_split()


if __name__ == "__main__":
    main()
