# Dataset Preparation — CivicSense ML Service

## Sources

| Source | Format | What it gives us |
|---|---|---|
| RDD2022 — India subset (train split), from Kaggle | Pascal VOC XML | Pothole (D40) + road crack (D00/D10/D20) boxes |
| TACO (Trash Annotations in Context) | COCO JSON | Litter/garbage boxes |

## Real numbers (measured, not estimated)

Ran against the actual RDD2022 India zip on 2026-09-19:

- **1,530 images**, all with at least one usable annotation, **0 dropped**
- **4,524 total boxes** in the raw file; **4,326 kept** after mapping to our
  3 final classes, **198 dropped** (rare RDD classes D44/D01/D50/D11/D43 —
  out of scope for this MVP, too few examples to train on anyway)
- Every single image contains at least one `POTHOLE` (D40) box — this
  Kaggle release looks like it was curated as a pothole-focused subset of
  RDD2022, with crack annotations present only incidentally. **Say this
  explicitly in the main project README** — it's a more honest framing
  than implying a balanced multi-class dataset.

After the 80/10/10 stratified split (`random_seed=42`, stratified by each
image's dominant class so val/test aren't accidentally single-class):

| Split | Images | POTHOLE boxes | ROAD_CRACK boxes |
|---|---|---|---|
| train | 1,224 | 2,543 | 907 |
| val | 152 | 327 | 122 |
| test | 154 | 317 | 110 |

GARBAGE / TACO: **not yet run** — `raw/taco/annotations.json` wasn't
present in this environment. Do this step yourself (see below), then
re-run `--stage taco` and `--stage merge` to get final combined numbers.
Until then, don't write TACO/GARBAGE numbers into your project README —
put the honest placeholder: "garbage class pending TACO integration."

## Why D10 (transverse crack) had to be merged, not kept separate

Only 23 boxes / 22 images across the whole dataset. Not trainable alone.
Merged into `ROAD_CRACK` along with D00 and D20 — document this decision,
it's a good interview answer ("I checked per-class support before
deciding on the taxonomy, not after training failed").

## Getting TACO without downloading 3GB to your laptop

1. Open a **Kaggle Notebook** (not your machine) — Kaggle's own infra
   pulls the dataset instantly, free, no bandwidth cost to you.
2. Load `annotations.json` first (tiny file) and filter it to
   `TACO_SUPERCATEGORIES_KEEP` (see `prepare_dataset.py`) **before**
   pulling any images — this is already what the script's `convert_taco()`
   expects: a filtered-or-full `annotations.json` plus the referenced
   image files under `raw/taco/`.
3. Only download the image files actually referenced by the filtered
   annotations (loop `coco["images"]` filtered to kept `image_id`s, fetch
   from TACO's Flickr URLs). This is meaningfully less than the full
   ~1,500 images / 3GB depending on how many supercategories you keep.
4. Bring back to your repo: **only** `model/best.pt` after training and
   the evaluation JSON — never the raw images.

## Running this script

```bash
cd ml-service/data_prep

# Place RDD2022 India files at:
#   raw/rdd2022_india/train/images/*.jpg
#   raw/rdd2022_india/train/annotations/xmls/*.xml

# Place TACO files at:
#   raw/taco/annotations.json
#   raw/taco/<image paths as referenced in annotations.json>

python prepare_dataset.py --stage all
```

Outputs land in `output/`: `images/{train,val,test}/`, `labels/{train,val,test}/`
(YOLO `.txt` format), `dataset.yaml` (ready for `ultralytics` training),
and `prep_report.json` (the numbers table above, regenerated).

## Class mapping reference

```
RDD2022 D40                          -> POTHOLE      (class 0)
RDD2022 D00, D10, D20                -> ROAD_CRACK    (class 1)
RDD2022 D44, D01, D50, D11, D43      -> dropped (out of scope)
TACO: Bottle, Bottle cap, Can, Carton, Cup, Food waste, Paper,
      Plastic bag & wrapper, Plastic container, Straw,
      Styrofoam piece, Unlabeled litter                -> GARBAGE (class 2)
```
