package firefly

import (
	"bytes"
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	xdraw "golang.org/x/image/draw"
)

type SavedMedia struct {
	URL      string
	ThumbURL string
}

func saveProcessedMedia(uploadDir, originalName, contentType string, src io.Reader) (SavedMedia, error) {
	if strings.HasPrefix(contentType, "image/") {
		return saveProcessedImage(uploadDir, src)
	}
	return saveRawMedia(uploadDir, originalName, src)
}

func saveRawMedia(uploadDir, originalName string, src io.Reader) (SavedMedia, error) {
	ext := filepath.Ext(originalName)
	if ext == "" {
		ext = ".bin"
	}
	name := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	target := filepath.Join(uploadDir, name)

	out, err := os.Create(target)
	if err != nil {
		return SavedMedia{}, err
	}
	defer out.Close()

	if _, err := io.Copy(out, src); err != nil {
		return SavedMedia{}, err
	}

	return SavedMedia{URL: "/uploads/" + name}, nil
}

func saveProcessedImage(uploadDir string, src io.Reader) (SavedMedia, error) {
	raw, err := io.ReadAll(src)
	if err != nil {
		return SavedMedia{}, err
	}

	img, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return SavedMedia{}, err
	}

	mainImage := resizeToFit(img, 1600, 1600)
	thumbImage := resizeToFit(img, 360, 360)

	mainName := fmt.Sprintf("%d-main.jpg", time.Now().UnixNano())
	thumbName := fmt.Sprintf("%d-thumb.jpg", time.Now().UnixNano())
	mainTarget := filepath.Join(uploadDir, mainName)
	thumbTarget := filepath.Join(uploadDir, thumbName)

	if err := writeJPEG(mainTarget, mainImage, 82); err != nil {
		return SavedMedia{}, err
	}
	if err := writeJPEG(thumbTarget, thumbImage, 70); err != nil {
		return SavedMedia{}, err
	}

	return SavedMedia{
		URL:      "/uploads/" + mainName,
		ThumbURL: "/uploads/" + thumbName,
	}, nil
}

func resizeToFit(src image.Image, maxWidth, maxHeight int) image.Image {
	bounds := src.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	if width <= maxWidth && height <= maxHeight {
		return src
	}

	scale := minFloat(float64(maxWidth)/float64(width), float64(maxHeight)/float64(height))
	targetWidth := int(float64(width) * scale)
	targetHeight := int(float64(height) * scale)
	if targetWidth < 1 {
		targetWidth = 1
	}
	if targetHeight < 1 {
		targetHeight = 1
	}

	dst := image.NewRGBA(image.Rect(0, 0, targetWidth, targetHeight))
	xdraw.CatmullRom.Scale(dst, dst.Bounds(), src, bounds, xdraw.Over, nil)
	return dst
}

func writeJPEG(path string, img image.Image, quality int) error {
	out, err := os.Create(path)
	if err != nil {
		return err
	}
	defer out.Close()
	return jpeg.Encode(out, img, &jpeg.Options{Quality: quality})
}

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func init() {
	image.RegisterFormat("jpeg", "jpeg", jpeg.Decode, jpeg.DecodeConfig)
	image.RegisterFormat("jpg", "jpg", jpeg.Decode, jpeg.DecodeConfig)
	image.RegisterFormat("png", "png", png.Decode, png.DecodeConfig)
	image.RegisterFormat("gif", "gif", gif.Decode, gif.DecodeConfig)
}
