import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // Let browser handle in-page anchors naturally.
    if (hash) return;

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search, hash]);

  return null;
};

export default ScrollToTop;
