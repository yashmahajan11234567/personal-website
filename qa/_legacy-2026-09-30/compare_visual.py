import cv2
import numpy as np
import os
from pathlib import Path

# Paths
SCREENSHOTS_DIR = Path("C:/Users/hitoy/Downloads/portfolio_website/qa-screenshots")
REFERENCE_LEFT_DIR = Path("C:/Users/hitoy/Downloads/portfolio_website")
REFERENCE_RIGHT_DIR = Path("C:/Users/hitoy/Downloads/portfolio_website")

# Test points
TEST_POINTS = [
    (0, "0s"),
    (10, "1.1s"),
    (25, "2.75s"),
    (50, "5.5s"),
    (75, "8.25s"),
    (90, "9.9s"),
    (100, "11s")
]

def compare_images(img1_path, img2_path, label=""):
    """Compare two images and return difference metrics."""
    if not os.path.exists(img1_path) or not os.path.exists(img2_path):
        return f"{label}: MISSING FILES - {img1_path} vs {img2_path}"
    
    img1 = cv2.imread(str(img1_path))
    img2 = cv2.imread(str(img2_path))
    
    if img1 is None or img2 is None:
        return f"{label}: FAILED TO LOAD - {img1_path} vs {img2_path}"
    
    # Resize to same dimensions if needed
    if img1.shape != img2.shape:
        img2 = cv2.resize(img2, (img1.shape[1], img1.shape[0]))
    
    # Calculate absolute difference
    diff = cv2.absdiff(img1, img2)
    
    # Convert to grayscale for percentage calculation
    gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    
    # Calculate percentage of non-zero pixels
    non_zero = np.count_nonzero(gray_diff)
    total = gray_diff.size
    diff_pct = (non_zero / total) * 100
    
    # Also calculate mean squared error
    mse = np.mean((img1.astype(float) - img2.astype(float)) ** 2)
    
    # Structural similarity (approximate)
    # Using mean of absolute differences normalized
    mean_diff = np.mean(gray_diff) / 255.0 * 100
    
    return {
        "label": label,
        "diff_pct": diff_pct,
        "mse": mse,
        "mean_diff_pct": mean_diff,
        "pass": diff_pct < 0.5 and mean_diff < 2.0
    }

def find_reference_file(base_dir, side, timestamp):
    """Find the reference file for a given side and timestamp."""
    patterns = [
        f"qa-reference-{side}-{timestamp}.png",
        f"qa-reference-{side}-{timestamp}s.png"
    ]
    for pattern in patterns:
        filepath = base_dir / pattern
        if filepath.exists():
            return filepath
    return None

def find_screenshot_file(screenshots_dir, side, pct):
    """Find the screenshot file for a given side and percentage."""
    patterns = [
        f"{side}-{pct}percent.png",
        f"hero-{side}-{pct}percent.png"
    ]
    for pattern in patterns:
        filepath = screenshots_dir / pattern
        if filepath.exists():
            return filepath
    return None

print("=" * 80)
print("VISUAL QA COMPARISON - Phase 1")
print("=" * 80)

all_passed = True

for pct, timestamp in TEST_POINTS:
    print(f"\n--- Testing at {pct}% scroll ({timestamp}) ---")
    
    # Data path (left side)
    ref_left = find_reference_file(REFERENCE_LEFT_DIR, "left", timestamp)
    shot_left = find_screenshot_file(SCREENSHOTS_DIR, "left", pct)
    
    if ref_left and shot_left:
        result = compare_images(ref_left, shot_left, f"Data (left) {pct}%")
        status = "PASS" if result.get("pass", False) else "FAIL"
        print(f"  Data {pct}%: {status} - diff={result.get('diff_pct', 'N/A'):.2f}%, mse={result.get('mse', 'N/A'):.2f}, mean_diff={result.get('mean_diff_pct', 'N/A'):.2f}%")
        if not result.get("pass", False):
            all_passed = False
    else:
        print(f"  Data {pct}%: SKIP - ref={ref_left}, shot={shot_left}")
        all_passed = False
    
    # Cloud path (right side)
    ref_right = find_reference_file(REFERENCE_RIGHT_DIR, "right", timestamp)
    shot_right = find_screenshot_file(SCREENSHOTS_DIR, "right", pct)
    
    if ref_right and shot_right:
        result = compare_images(ref_right, shot_right, f"Cloud (right) {pct}%")
        status = "PASS" if result.get("pass", False) else "FAIL"
        print(f"  Cloud {pct}%: {status} - diff={result.get('diff_pct', 'N/A'):.2f}%, mse={result.get('mse', 'N/A'):.2f}, mean_diff={result.get('mean_diff_pct', 'N/A'):.2f}%")
        if not result.get("pass", False):
            all_passed = False
    else:
        print(f"  Cloud {pct}%: SKIP - ref={ref_right}, shot={shot_right}")
        all_passed = False

print("\n" + "=" * 80)
if all_passed:
    print("ALL TESTS PASSED ✓")
else:
    print("SOME TESTS FAILED ✗")
print("=" * 80)