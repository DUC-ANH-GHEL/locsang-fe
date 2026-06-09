import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Play, Volume2, VolumeX } from 'lucide-react';

import { homeContentService } from '../../services/homeContentService';
import { useSEO } from '../../hooks/useSEO';

const FALLBACK_COVER = '/locsang-assets/brand-logo.svg';

const parseYouTubeId = (rawUrl) => {
  const url = String(rawUrl || '').trim();
  if (!url) return '';
  const patterns = [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/i,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{6,})/i,
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return '';
};

const resolveVideoKind = (url) => {
  const raw = String(url || '').trim();
  if (!raw) return { kind: 'unknown', src: '' };

  const youtubeId = parseYouTubeId(raw);
  if (youtubeId) {
    return { kind: 'youtube', src: `https://www.youtube.com/embed/${youtubeId}`, youtubeId };
  }

  const lower = raw.toLowerCase();
  if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg') || lower.includes('.mp4?')) {
    return { kind: 'file', src: raw };
  }

  return { kind: 'embed', src: raw };
};

const ShortsFeed = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const scrollContainerRef = useRef(null);
  const containerRefs = useRef([]);
  const videoRefs = useRef([]);
  const iframeRefs = useRef([]);
  const effectiveMuted = isMuted;

  const sendYouTubeCommand = (iframe, func, args = []) => {
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*',
    );
  };

  const attemptPlayFileVideo = (video, shouldUnmuteAfterStart = false) => {
    if (!video) return;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.muted = true;

    const playPromise = video.play();
    const tryUnmute = () => {
      if (!shouldUnmuteAfterStart) return;
      video.muted = false;
      const resumePromise = video.play();
      if (resumePromise && typeof resumePromise.catch === 'function') {
        resumePromise.catch(() => {
          video.muted = true;
          setIsMuted(true);
        });
      }
    };

    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(() => {
        window.setTimeout(tryUnmute, 120);
      });
    } else {
      window.setTimeout(tryUnmute, 120);
    }

    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        if (video.muted) return;
        // Mobile browsers may block autoplay with sound after swipe, retry muted.
        video.muted = true;
        setIsMuted(true);
        const mutedRetryPromise = video.play();
        if (mutedRetryPromise && typeof mutedRetryPromise.catch === 'function') {
          mutedRetryPromise.catch(() => {});
        }
      });
    }
  };

  useSEO({
    title: 'Lộc Sang Shorts',
    description: 'Xem video ngan Lộc Sang theo kieu vuot doc va autoplay.',
    canonicalPath: '/shorts',
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const res = await homeContentService.getPublicHomeContent();
        const content = res?.content || {};
        const shortsRaw = Array.isArray(content?.shorts_items) ? content.shorts_items : [];
        const normalized = shortsRaw
          .map((item, index) => {
            if (!item || typeof item !== 'object') return null;
            const url = String(item.url || '').trim();
            if (!url) return null;
            const resolved = resolveVideoKind(url);
            return {
              id: `${index}-${url}`,
              title: String(item.title || '').trim() || `Video ${index + 1}`,
              thumbnail: String(item.thumbnail_url || '').trim() || FALLBACK_COVER,
              kind: resolved.kind,
              src: resolved.src,
              youtubeId: resolved.youtubeId || '',
              originalUrl: url,
            };
          })
          .filter(Boolean);

        if (!cancelled) {
          setItems(normalized);
          setActiveIndex(0);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const rootNode = scrollContainerRef.current || null;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = Number((entry.target).getAttribute('data-index') || -1);
          if (Number.isFinite(idx) && idx >= 0) {
            setActiveIndex(idx);
          }
        });
      },
      { threshold: 0.65, root: rootNode },
    );

    containerRefs.current.forEach((node) => {
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !items.length) return;

    let rafId = 0;

    const syncActiveByScroll = () => {
      const center = container.scrollTop + (container.clientHeight / 2);
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      containerRefs.current.forEach((node, idx) => {
        if (!node) return;
        const nodeCenter = node.offsetTop + (node.clientHeight / 2);
        const distance = Math.abs(nodeCenter - center);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = idx;
        }
      });

      setActiveIndex((prev) => (prev === bestIndex ? prev : bestIndex));
    };

    const onScroll = () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(syncActiveByScroll);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    syncActiveByScroll();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', onScroll);
    };
  }, [items]);

  useEffect(() => {
    const retryTimers = [];

    videoRefs.current.forEach((video, idx) => {
      if (!video) return;
      video.muted = true;
      if (idx === activeIndex) {
        [0, 140, 360].forEach((delay) => {
          const timer = window.setTimeout(() => {
            attemptPlayFileVideo(video, !effectiveMuted);
          }, delay);
          retryTimers.push(timer);
        });
      } else {
        video.pause();
        video.muted = true;
      }
    });

    return () => {
      retryTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [activeIndex, effectiveMuted, items]);

  useEffect(() => {
    const timers = [];
    items.forEach((item, idx) => {
      if (item.kind !== 'youtube') return;
      const iframe = iframeRefs.current[idx];
      if (!iframe) return;

      if (idx === activeIndex) {
        [0, 160, 420, 900].forEach((delay) => {
          const timer = window.setTimeout(() => {
            sendYouTubeCommand(iframe, 'mute');
            sendYouTubeCommand(iframe, 'playVideo');
          }, delay);
          timers.push(timer);
        });

        if (!effectiveMuted) {
          [260, 620].forEach((delay) => {
            const timer = window.setTimeout(() => {
              sendYouTubeCommand(iframe, 'unMute');
              sendYouTubeCommand(iframe, 'playVideo');
            }, delay);
            timers.push(timer);
          });
        }
      } else {
        sendYouTubeCommand(iframe, 'pauseVideo');
        sendYouTubeCommand(iframe, 'mute');
      }
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [activeIndex, effectiveMuted, items]);

  const activeLabel = useMemo(() => {
    if (!items.length) return '0 / 0';
    return `${activeIndex + 1} / ${items.length}`;
  }, [items.length, activeIndex]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#131314] text-[#f2eee8]">
        <div className="text-sm font-semibold">Đang tải Lộc Sang Shorts...</div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#131314] px-4 text-center text-[#f2eee8]">
        <div className="max-w-md">
          <h1 className="text-2xl font-black">Lộc Sang Shorts chưa có video</h1>
          <p className="mt-2 text-sm text-[#bdb7ac]">Admin có thể thêm URL short video trong màn Quản lý Shorts để hiển thị ở đây.</p>
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#181817]"
          >
            <ChevronLeft size={16} /> Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="relative h-[100dvh] overflow-y-auto bg-[#0f0f0f] text-white"
      style={{ scrollSnapType: 'y mandatory' }}
    >
      <div className="pointer-events-none fixed left-0 right-0 top-0 z-30 flex items-center justify-between px-4 py-3">
        <Link
          to="/"
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold backdrop-blur"
        >
          <ChevronLeft size={14} /> Quay lại
        </Link>
        <div className="rounded-full bg-black/45 px-3 py-1 text-xs font-semibold backdrop-blur">{activeLabel}</div>
      </div>

      {items.map((item, index) => (
        <section
          key={item.id}
          data-index={index}
          ref={(el) => {
            containerRefs.current[index] = el;
          }}
          className="relative h-[100dvh] w-full"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div className="absolute inset-0 bg-black">
            {item.kind === 'file' && (
              <video
                ref={(el) => {
                  videoRefs.current[index] = el;
                }}
                src={item.src}
                poster={item.thumbnail}
                autoPlay={index === activeIndex}
                playsInline
                loop
                controls={false}
                muted={effectiveMuted}
                preload="auto"
                onLoadedData={() => {
                  if (index === activeIndex) {
                    attemptPlayFileVideo(videoRefs.current[index], effectiveMuted);
                  }
                }}
                className="h-full w-full object-contain"
              />
            )}

            {item.kind === 'youtube' && (
              <iframe
                ref={(el) => {
                  iframeRefs.current[index] = el;
                }}
                title={item.title}
                src={`${item.src}?autoplay=${index === activeIndex ? 1 : 0}&mute=1&playsinline=1&loop=1&playlist=${item.youtubeId}&controls=0&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                referrerPolicy="origin-when-cross-origin"
                loading="lazy"
                onLoad={() => {
                  const iframe = iframeRefs.current[index];
                  if (index === activeIndex) {
                    sendYouTubeCommand(iframe, 'mute');
                    sendYouTubeCommand(iframe, 'playVideo');
                    if (!effectiveMuted) {
                      window.setTimeout(() => {
                        sendYouTubeCommand(iframe, 'unMute');
                        sendYouTubeCommand(iframe, 'playVideo');
                      }, 260);
                    }
                  } else {
                    sendYouTubeCommand(iframe, 'pauseVideo');
                    sendYouTubeCommand(iframe, 'mute');
                  }
                }}
              />
            )}

            {item.kind === 'embed' && (
              <iframe
                title={item.title}
                src={index === activeIndex ? item.src : 'about:blank'}
                className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                referrerPolicy="origin-when-cross-origin"
              />
            )}
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/25" />

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 p-4">
            <div className="max-w-xl rounded-2xl bg-black/45 p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black">{item.title}</div>
                  <div className="mt-1 text-[11px] text-[#ddd7cc]">Lướt lên để xem video tiếp theo</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextMuted = !isMuted;
                    setIsMuted(nextMuted);

                    const activeItem = items[activeIndex];
                    if (activeItem?.kind === 'file') {
                      const video = videoRefs.current[activeIndex];
                      if (video) {
                        attemptPlayFileVideo(video, !nextMuted);
                      }
                    }

                    if (activeItem?.kind === 'youtube') {
                      const iframe = iframeRefs.current[activeIndex];
                      sendYouTubeCommand(iframe, 'mute');
                      sendYouTubeCommand(iframe, 'playVideo');
                      if (!nextMuted) {
                        window.setTimeout(() => {
                          sendYouTubeCommand(iframe, 'unMute');
                          sendYouTubeCommand(iframe, 'playVideo');
                        }, 220);
                      }
                    }
                  }}
                  className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15"
                >
                  {effectiveMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
              </div>
              {index === activeIndex && item.kind === 'file' && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[11px]">
                  <Play size={10} /> Đang phát tự động
                </div>
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};

export default ShortsFeed;
