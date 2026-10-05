import { describe, expect, it } from 'vitest';
import { tutorVideoSource } from './VideoClassPage.jsx';

describe('tutorVideoSource (튜터 소개 영상 재생 방식)', () => {
  it('turns YouTube embed/watch/short links into a thumbnail + autoplay embed', () => {
    for (const url of ['https://www.youtube.com/embed/kJQP7kiw5Fk', 'https://www.youtube.com/watch?v=kJQP7kiw5Fk&t=3', 'https://youtu.be/kJQP7kiw5Fk']) {
      const v = tutorVideoSource({ embedVideoUrl: url });
      expect(v).toMatchObject({ kind: 'youtube', id: 'kJQP7kiw5Fk', thumb: 'https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg' });
      expect(v.embed).toBe('https://www.youtube.com/embed/kJQP7kiw5Fk?autoplay=1&rel=0');
    }
  });

  it('converts a Vimeo page link to the player URL (the server leaves it as-is)', () => {
    expect(tutorVideoSource({ embedVideoUrl: 'https://vimeo.com/76979871' })).toMatchObject({ kind: 'vimeo', embed: 'https://player.vimeo.com/video/76979871?autoplay=1' });
  });

  it('plays http(s) video files directly and ignores anything else', () => {
    expect(tutorVideoSource({ videoUrl: 'https://cdn.example.com/intro.mp4' })).toEqual({ kind: 'file', src: 'https://cdn.example.com/intro.mp4' });
    expect(tutorVideoSource({ videoUrl: 'javascript:alert(1)//.mp4' })).toBeNull();
    expect(tutorVideoSource({ videoUrl: '' })).toBeNull();
    expect(tutorVideoSource({})).toBeNull();
  });
});
