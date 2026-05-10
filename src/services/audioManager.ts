
export type SoundEffect = 'dice' | 'step' | 'coin' | 'lose' | 'event' | 'goal' | 'click' | 'roulette' | 'roulette_stop' | 'card' | 'win';

const SE_URLS: Record<SoundEffect, string> = {
  dice: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  step: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  coin: 'https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3',
  lose: 'https://assets.mixkit.co/active_storage/sfx/2002/2002-preview.mp3',
  event: 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3',
  goal: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  roulette: 'https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3', // Clicky spin
  roulette_stop: 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3', // Bell
  card: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Pop/Flip
  win: 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3', // Victory fanfare
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
