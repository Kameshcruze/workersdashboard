(() => {
  const fileNameSorter = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });

  const galleryMedia = [
    "1.mp4",
    "2.mp4",
    "3.mp4",
    "4.mp4",
    "5.mp4",
    "6.mp4",
    "7.mp4",
    "100.jpg",
    "101.jpg",
    "102.jpg",
    "103.jpg",
    "104.jpg",
    "105.jpg",
    "106.jpg",
    "107.jpg",
    "108.jpg",
    "109.jpg",
    "110.jpg",
    "111.jpg",
    "112.jpg",
    "113.jpeg",
    "114.jpeg",
    "115.jpeg",
    "42.jpeg",
    "43.jpeg",
    "44.jpeg",
    "45.jpeg",
    "46.jpeg",
    "47.jpeg",
    "48.jpeg",
    "49.jpeg",
    "50.jpeg",
    "51.jpeg",
    "52.mp4",
    "54.jpeg",
    "55.jpeg",
    "56.jpeg",
    "57.jpeg",
    "58.jpeg",
    "59.jpeg",
    "64.jpeg",
    "65.jpeg",
    "66.jpeg",
    "67.jpeg",
    "69.jpeg",
    "70.jpeg",
    "72.jpeg",
    "73.jpeg",
    "75.jpeg",
    "76.jpg",
    "77.jpeg",
    "78.jpeg",
    "79.jpeg",
    "80.jpeg",
    "81.jpeg",
    "82.jpeg",
    "83.jpeg",
    "84.jpeg",
    "85.jpeg",
    "86.jpeg",
    "87.jpeg",
    "88.jpeg",
    "89.jpeg",
    "90.jpg",
    "91.jpg",
    "92.jpg",
    "93.jpg",
    "94.jpg",
    "95.jpg",
    "96.jpg",
    "97.jpg",
    "98.jpg",
    "99.jpg",
    "house video.mp4",
    "Virukshaa Uruthi-images-14.jpg.jpeg",
    "Virukshaa Uruthi-images-4.jpg.jpeg",
    "Virukshaa Uruthi-images-42.jpg.jpeg",
    "Virukshaa Uruthi-images-68.jpg.jpeg",
    "Virukshaa Uruthi-images-71.jpg.jpeg",
    "Virukshaa Uruthi-images-87.jpg.jpeg",
    "Virukshaa Uruthi-images-91.jpg.jpeg",
  ].sort((left, right) => fileNameSorter.compare(right, left));

  const imageExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
  const videoExtensions = new Set(["mp4", "webm", "ogg"]);
  const initialGalleryPriorityCount = 6;

  const getExtension = (fileName) => fileName.split(".").pop().toLowerCase();
  const getBaseName = (fileName) => fileName.replace(/\.[^.]+$/, "");
  const isImage = (fileName) => imageExtensions.has(getExtension(fileName));
  const isVideo = (fileName) => videoExtensions.has(getExtension(fileName));

  const createPreviewImage = (fileName) => {
    const image = document.createElement("img");
    const previewIndex = galleryMedia.filter(isImage).indexOf(fileName);
    const isPriorityPreview = previewIndex > -1 && previewIndex < 4;

    image.loading = isPriorityPreview ? "eager" : "lazy";
    image.decoding = "async";
    image.setAttribute("fetchpriority", isPriorityPreview ? "high" : "low");
    image.src = `assets/Gallery/${fileName}`;
    image.alt = "gallery";
    return image;
  };

  const createGalleryCard = (fileName, index) => {
    const article = document.createElement("article");
    article.className = "gallery-card";
    article.tabIndex = 0;
    article.dataset.fileName = fileName;

    if (isVideo(fileName)) {
      const video = document.createElement("video");
      const source = document.createElement("source");
      const isPriorityMedia = index < initialGalleryPriorityCount;

      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = isPriorityMedia ? "metadata" : "none";
      video.setAttribute("aria-label", `Gallery video ${getBaseName(fileName)}`);
      video.setAttribute("fetchpriority", isPriorityMedia ? "high" : "low");

      source.dataset.src = `assets/Gallery/${fileName}`;
      source.type = `video/${getExtension(fileName)}`;

      if (isPriorityMedia) {
        source.src = source.dataset.src;
      }

      video.appendChild(source);
      article.appendChild(video);
      return article;
    }

    const image = document.createElement("img");
    const isPriorityImage = index < initialGalleryPriorityCount;
    const imageSrc = `assets/Gallery/${fileName}`;

    image.loading = isPriorityImage ? "eager" : "lazy";
    image.decoding = "async";
    image.setAttribute("fetchpriority", isPriorityImage ? "high" : "low");
    image.alt = `Gallery image ${getBaseName(fileName)}`;

    if (isPriorityImage) {
      image.src = imageSrc;
    } else {
      image.dataset.src = imageSrc;
    }

    article.appendChild(image);
    return article;
  };

  const renderGalleryPreview = () => {
    const previewImages = galleryMedia.filter(isImage).slice(0, 8);

    document.querySelectorAll("[data-gallery-preview]").forEach((grid) => {
      grid.replaceChildren(...previewImages.map(createPreviewImage));
    });
  };

  const renderGalleryGrid = () => {
    document.querySelectorAll("[data-gallery-full]").forEach((grid) => {
      grid.replaceChildren(...galleryMedia.map((fileName, index) => createGalleryCard(fileName, index)));
    });
  };

  const registerPreloadHints = () => {
    if (!document.head) return;

    galleryMedia
      .filter(isImage)
      .slice(0, 4)
      .forEach((fileName) => {
        const href = `assets/Gallery/${fileName}`;

        if (document.head.querySelector(`link[rel="preload"][href="${href}"]`)) {
          return;
        }

        const preloadLink = document.createElement("link");
        preloadLink.rel = "preload";
        preloadLink.as = "image";
        preloadLink.href = href;
        document.head.appendChild(preloadLink);
      });
  };

  registerPreloadHints();
  renderGalleryPreview();
  renderGalleryGrid();

  window.galleryMedia = galleryMedia;
})();
