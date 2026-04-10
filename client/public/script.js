import * as hirefreelancer from './scripts/hirefreelancer.js';
import * as findwork from './scripts/findwork.js';


hirefreelancer.loadHireTab();
findwork.setupWorkTabs();
const mediaFiles = [
    { type: "image", src: "/images/1.jpg" },
    { type: "video", src: "/videos/2.mp4" },
    { type: "image", src: "/images/3.jpg" },
    { type: "image", src: "/images/4.jpg" },
    { type: "image", src: "/images/5.jpg" },
    { type: "video", src: "/videos/6.mp4" },
    { type: "image", src: "/images/7.webp" },
    { type: "image", src: "/images/8.jpeg" },
    { type: "image", src: "/images/9.jpg" },
    { type: "image", src: "/images/10.avif" },
    { type: "image", src: "/images/11.jpg" }
];

let currentIndex = 0;
const adContainer = document.getElementById("ad-media");


const textElements = Array.from(adContainer.childNodes).filter(node => node.nodeType === Node.ELEMENT_NODE);

function showNextAd() {
    const media = mediaFiles[currentIndex];


    const existingMedia = adContainer.querySelector(".ad-slide");
    if (existingMedia) {
        adContainer.removeChild(existingMedia);
    }

    let newElement;

    if (media.type === "image") {
        newElement = document.createElement("img");
        newElement.src = media.src;
        newElement.className = "ad-slide";
    } else if (media.type === "video") {
        newElement = document.createElement("video");
        newElement.src = media.src;
        newElement.className = "ad-slide";
        newElement.autoplay = true;
        newElement.muted = true;
        newElement.loop = false;


        newElement.onended = () => {
            setTimeout(showNextAd, 1000);
        };
    }


    adContainer.prepend(newElement);

    currentIndex = (currentIndex + 1) % mediaFiles.length;


    if (media.type === "image") {
        setTimeout(showNextAd, 3000);
    }
}

// Start slideshow
showNextAd();