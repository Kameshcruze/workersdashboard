const menuBtn = document.getElementById("menu-btn");
const navLinks = document.getElementById("nav-links");
const menuBtnIcon = menuBtn.querySelector("i");
const siteNav = document.querySelector("nav");
let lastScrollY = window.scrollY;

const wireImmediateNavigation = (selector) => {
  document.querySelectorAll(selector).forEach((link) => {
    if (!link || link.dataset.instantNavBound === "true") return;

    link.dataset.instantNavBound = "true";
    const navigateToTarget = (event) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      event.preventDefault();
      if (link.dataset.navigating === "true") return;

      link.dataset.navigating = "true";
      window.location.assign(link.href);
    };

    link.addEventListener("pointerdown", navigateToTarget);
    link.addEventListener("click", navigateToTarget);
  });
};

menuBtn.addEventListener("click", (e) => {
  navLinks.classList.toggle("open");
  siteNav?.classList.remove("nav-hidden");

  const isOpen = navLinks.classList.contains("open");
  menuBtnIcon.setAttribute("class", isOpen ? "ri-close-line" : "ri-menu-line");
});

navLinks.addEventListener("click", (e) => {
  navLinks.classList.remove("open");
  menuBtnIcon.setAttribute("class", "ri-menu-line");
});

wireImmediateNavigation('.hero__cta[href="gallery.html"], .gallery__btn a[href="gallery.html"]');

const scrollRevealOption = {
  distance: "50px",
  origin: "bottom",
  duration: 1000,
};

const canUseScrollReveal = typeof ScrollReveal === "function";
const revealOnScroll = (selector, options) => {
  if (!canUseScrollReveal) return;
  ScrollReveal().reveal(selector, options);
};

revealOnScroll(".about__container .section__header", {
  ...scrollRevealOption,
});
revealOnScroll(".about__container .section__description", {
  ...scrollRevealOption,
  delay: 500,
  interval: 500,
});
revealOnScroll(".about__container img", {
  ...scrollRevealOption,
  delay: 1500,
});

// ScrollReveal().reveal(".service__container .section__header", {
//   ...scrollRevealOption,
// });
// ScrollReveal().reveal(".service__container .section__description", {
//   ...scrollRevealOption,
//   delay: 500,
// });
// ScrollReveal().reveal(".service__card", {
//   duration: 1000,
//   delay: 1000,
//   interval: 500,
// });
revealOnScroll(".services__modern .section__header", {
  ...scrollRevealOption,
});

// const swiper = new Swiper(".swiper", {
//   loop: true,
//   pagination: {
//     el: ".swiper-pagination",
//   },
// });
const clientSwiperEl = document.querySelector(".client-swiper");

if (clientSwiperEl) {
  new Swiper(".client-swiper", {
    loop: true,
    speed: 800,

    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
    },

    pagination: {
      el: ".client-swiper .swiper-pagination",
      clickable: true,
    },
  });
}

const processInstagramEmbeds = (attempt = 0) => {
  if (window.instgrm?.Embeds?.process) {
    window.instgrm.Embeds.process();
    return;
  }

  if (attempt < 12) {
    setTimeout(() => processInstagramEmbeds(attempt + 1), 800);
  }
};



revealOnScroll(".blog__content .section__header", {
  ...scrollRevealOption,
});
revealOnScroll(".blog__content h4", {
  ...scrollRevealOption,
  delay: 500,
});
revealOnScroll(".blog__content p", {
  ...scrollRevealOption,
  delay: 1000,
});
revealOnScroll(".blog__content .blog__btn", {
  ...scrollRevealOption,
  delay: 1500,
});

// const instagram = document.querySelector(".instagram__flex");

// Array.from(instagram.children).forEach((item) => {
//   const duplicateNode = item.cloneNode(true);
//   duplicateNode.setAttribute("aria-hidden", true);
//   instagram.appendChild(duplicateNode);
// });

// Call button attention on page load
window.addEventListener("load", () => {
  const callBtn = document.querySelector(".floating-btn.call");

  if (!callBtn) return;

  // Delay so page settles
  setTimeout(() => {
    callBtn.classList.add("attention");
    callBtn.classList.add("show-tooltip");

    // Remove tooltip after 3 seconds
    setTimeout(() => {
      callBtn.classList.remove("show-tooltip");
    }, 3000);
  }, 1200);

  processInstagramEmbeds();
});



revealOnScroll(".instagram__container .section__header", {
  distance: "60px",
  origin: "bottom",
  duration: 1200,
  opacity: 0,
  easing: "cubic-bezier(0.5, 0, 0, 1)",
});


/* ===============================
   Counter Animation
   =============================== */

const counters = document.querySelectorAll(".counter");

const runCounters = () => {
  counters.forEach(counter => {
    const target = +counter.getAttribute("data-target");
    const duration = 1500;
    const stepTime = 20;
    const totalSteps = duration / stepTime;
    const increment = target / totalSteps;

    let current = 0;

    const updateCounter = () => {
      current += increment;
      if (current < target) {
        counter.innerText = Math.floor(current) + "+";
        setTimeout(updateCounter, stepTime);
      } else {
        counter.innerText = target + "+";
      }
    };

    updateCounter();
  });
};

/* Run when section enters viewport */
const statsSection = document.querySelector(".stats__section");

if (statsSection) {
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      runCounters();
      observer.disconnect();
    }
  }, { threshold: 0.4 });

  observer.observe(statsSection);
}





const instaSwiperEl = document.querySelector(".insta-swiper");

if (instaSwiperEl) {
  new Swiper(".insta-swiper", {
    loop: true,
    speed: 800,

    slidesPerView: 1,
    spaceBetween: 0,

    centeredSlides: false,
    loopAdditionalSlides: 1,

    autoplay: {
      delay: 2500,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },

    pagination: {
      el: ".insta-swiper .swiper-pagination",
      clickable: true,
    },

    allowTouchMove: true,

    on: {
      init: processInstagramEmbeds,
      slideChangeTransitionEnd: processInstagramEmbeds,
    },
  });
}

/* ===============================
   Contact Form → Google Sheets
   =============================== */

const form = document.getElementById("contactForm");

if (form) {
  const scriptURL = "https://script.google.com/macros/s/AKfycbxzzIrZdCmOqhQldaxbNkQlNNjRSef5sIP-0kKuq2Ah2tYeellaIqz4D2WksJT4dxknIw/exec";
  const submitButton = form.querySelector('button[type="submit"]');
  const statusElement = document.getElementById("form-status");
  const defaultButtonText = submitButton?.textContent || "Submit Now";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!scriptURL || scriptURL.includes("PASTE_YOUR")) {
      if (statusElement) {
        statusElement.textContent = "Add your Apps Script web app URL before using the form.";
      }
      return;
    }

    const payload = {
      fullName: form.elements.fullName.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      message: form.elements.message.value.trim(),
    };

    if (!/^\d{10}$/.test(payload.phone)) {
      if (statusElement) {
        statusElement.textContent = "Phone number must be exactly 10 digits.";
      }
      form.elements.phone.focus();
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    if (statusElement) {
      statusElement.textContent = "Sending your message...";
    }

    try {
      const body = new URLSearchParams(payload);
      const response = await fetch(scriptURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: body.toString(),
      });

      const result = await response.json().catch(() => ({
        ok: false,
        error: "Invalid response from Apps Script.",
      }));

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Submission failed.");
      }

      form.reset();
      if (statusElement) {
        statusElement.textContent = "Thank you! We’re excited to be part of your event. We’ll contact you soon.";
      }
    } catch (error) {
      if (statusElement) {
        statusElement.textContent = error.message || "Something went wrong. Please try again.";
      }
      console.error(error);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonText;
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {

  const popup = document.getElementById("callPopup");
  const closeBtn = document.getElementById("closePopup");

  if (!popup || !closeBtn) return;

  // Show popup after 10 seconds
  setTimeout(function () {
    popup.style.display = "flex";
    document.body.style.overflow = "hidden";
  }, 10000);

  // Close popup
  closeBtn.addEventListener("click", function () {
    popup.style.display = "none";
    document.body.style.overflow = "auto";
  });

  // Close when clicking outside box
  popup.addEventListener("click", function (e) {
    if (e.target === popup) {
      popup.style.display = "none";
      document.body.style.overflow = "auto";
    }
  });

});

const scrollTopBtn = document.getElementById("scrollTopBtn");
const handlePageScroll = () => {
  const currentScrollY = window.scrollY;

  if (scrollTopBtn) {
    scrollTopBtn.classList.toggle("show", currentScrollY > 120);
  }

  if (siteNav && !navLinks.classList.contains("open")) {
    const shouldHideNav = currentScrollY > 140 && currentScrollY > lastScrollY;
    siteNav.classList.toggle("nav-hidden", shouldHideNav);
  }

  lastScrollY = currentScrollY;
};

let isScrollTicking = false;
const requestPageScrollUpdate = () => {
  if (isScrollTicking) return;

  isScrollTicking = true;
  window.requestAnimationFrame(() => {
    handlePageScroll();
    isScrollTicking = false;
  });
};

window.addEventListener("scroll", requestPageScrollUpdate, { passive: true });
handlePageScroll();

if (scrollTopBtn) {
  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

const deferredVideos = Array.from(document.querySelectorAll("video"));

if (deferredVideos.length) {
  const loadDeferredVideo = (video) => {
    if (video.dataset.loaded === "true") {
      return;
    }

    video.load();
    video.dataset.loaded = "true";
  };

  const primeDeferredVideo = (video) => {
    if (video.dataset.primed === "true") {
      return;
    }

    if (video.preload === "none") {
      video.preload = "metadata";
    }

    video.load();
    video.dataset.primed = "true";
  };

  const syncDeferredVideoPlayback = (video, shouldPlay) => {
    if (!video.autoplay) {
      return;
    }

    if (shouldPlay) {
      loadDeferredVideo(video);
      video.play().catch(() => {});
      return;
    }

    video.pause();
  };

  if ("IntersectionObserver" in window) {
    const videoObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          const isVisible = entry.isIntersecting;
          const isNearViewport = entry.isIntersecting || entry.intersectionRatio > 0;

          if (isNearViewport) {
            primeDeferredVideo(video);
          }

          if (isVisible) {
            loadDeferredVideo(video);
          }

          syncDeferredVideoPlayback(video, isVisible);
        });
      },
      {
        rootMargin: "900px 0px",
        threshold: 0.01,
      }
    );

    deferredVideos.forEach((video) => {
      const rect = video.getBoundingClientRect();
      if (rect.top < window.innerHeight * 1.5) {
        primeDeferredVideo(video);
      }
      videoObserver.observe(video);
    });
  } else {
    deferredVideos.forEach((video) => {
      primeDeferredVideo(video);
      loadDeferredVideo(video);
    });
  }
}

const heroCarousel = document.getElementById("hero-carousel");

if (heroCarousel) {
  const heroSlides = Array.from(heroCarousel.querySelectorAll(".hero__slide"));
  const heroDots = Array.from(heroCarousel.querySelectorAll(".hero__dot"));
  let activeHeroIndex = 0;
  let heroTimer = null;

  const clearHeroTimer = () => {
    if (heroTimer) {
      clearTimeout(heroTimer);
      heroTimer = null;
    }
  };

  const scheduleHeroAdvance = () => {
    clearHeroTimer();

    const activeMedia = heroSlides[activeHeroIndex]?.querySelector(".hero__media");

    if (!activeMedia) return;

    if (activeMedia.tagName === "VIDEO") {
      activeMedia.currentTime = 0;
      activeMedia.play().catch(() => {});
      return;
    }

    heroTimer = setTimeout(() => {
      showHeroSlide((activeHeroIndex + 1) % heroSlides.length);
    }, 3500);
  };

  const showHeroSlide = (index) => {
    clearHeroTimer();
    activeHeroIndex = index;

    heroSlides.forEach((slide, slideIndex) => {
      const media = slide.querySelector(".hero__media");
      const isActive = slideIndex === activeHeroIndex;

      slide.classList.toggle("active", isActive);
      heroDots[slideIndex]?.classList.toggle("active", isActive);

      if (media?.tagName === "VIDEO") {
        if (isActive) {
          media.currentTime = 0;
          media.play().catch(() => {});
        } else {
          media.pause();
          media.currentTime = 0;
        }
      }
    });

    scheduleHeroAdvance();
  };

  heroSlides.forEach((slide, index) => {
    const media = slide.querySelector(".hero__media");

    if (media?.tagName === "VIDEO") {
      media.addEventListener("ended", () => {
        if (index === activeHeroIndex) {
          showHeroSlide((activeHeroIndex + 1) % heroSlides.length);
        }
      });
    }
  });

  heroDots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      showHeroSlide(index);
    });
  });

  showHeroSlide(0);
}
