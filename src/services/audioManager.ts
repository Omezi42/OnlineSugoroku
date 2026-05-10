
export type SoundEffect = 'dice' | 'step' | 'coin' | 'lose' | 'event' | 'goal' | 'click' | 'roulette' | 'roulette_stop' | 'card' | 'win';

const SE_URLS: Record<SoundEffect, string> = {
  dice: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  step: 'https://www.soundjay.com/buttons/button-20.mp3',
  coin: 'https://www.soundjay.com/buttons/button-37.mp3',
  lose: 'https://www.soundjay.com/buttons/button-10.mp3',
  event: 'https://www.soundjay.com/buttons/button-28.mp3',
  goal: 'https://www.soundjay.com/buttons/button-3.mp3',
  click: 'https://www.soundjay.com/buttons/button-50.mp3',
  roulette: 'https://www.soundjay.com/buttons/button-29.mp3',
  roulette_stop: 'https://www.soundjay.com/buttons/button-9.mp3',
  card: 'https://www.soundjay.com/buttons/button-14.mp3',
  win: 'https://www.soundjay.com/buttons/button-4.mp3',
};

export type BGMType = 'none' | 'chill' | 'ambient' | 'lofi' | 'cafe';

const BGM_URLS: Record<BGMType, string> = {
  none: '',
  chill: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  ambient: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
  lofi: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
  cafe: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
};

class AudioManager {
  private seCache: Map<string, HTMLAudioElement> = new Map();
  private bgm: HTMLAudioElement | null = null;
  private seVolume: number = 0.5;
  private bgmVolume: number = 0.3;
  private isMuted: boolean = false;

  constructor() {
    // Preload some SE
    Object.entries(SE_URLS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.seCache.set(key, audio);
    });
  }

  setVolume(se: number, bgm: number) {
    this.seVolume = se;
    this.bgmVolume = bgm;
    if (this.bgm) {
      this.bgm.volume = this.isMuted ? 0 : this.bgmVolume;
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.bgm) {
      this.bgm.volume = muted ? 0 : this.bgmVolume;
    }
  }

  playSe(type: SoundEffect) {
    if (this.isMuted) return;
    const audio = this.seCache.get(type);
    if (audio) {
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = this.seVolume;
      clone.play().catch(e => console.warn('Audio play failed:', e));
    }
  }

  async playBgm(type: BGMType) {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm = null;
    }

    if (type === 'none' || !BGM_URLS[type]) return;

    const audio = new Audio(BGM_URLS[type]);
    audio.loop = true;
    audio.volume = this.isMuted ? 0 : this.bgmVolume;
    this.bgm = audio;
    
    try {
      await audio.play();
    } catch (e) {
      console.warn('BGM play failed. User interaction might be required.', e);
      // 自動再生がブロックされた場合、次回のインタラクションで再生されるようにするなどの処理が必要
    }
  }

  stopBgm() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm = null;
    }
  }
}

export const audioManager = new AudioManager();
