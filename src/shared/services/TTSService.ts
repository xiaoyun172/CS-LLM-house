/**
 * TTS服务类
 * 使用硅基流动TTS API和Web Speech API提供免费的文本到语音转换功能
 */
export class TTSService {
  private static instance: TTSService;
  private audio: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private currentAudioBlob: string | null = null;
  private currentMessageId: string | null = null;
  // 硅基流动API Key，实际应用中应从环境变量或安全存储中获取
  private siliconFlowApiKey: string = '';
  // 默认使用的语音模型
  private defaultModel: string = 'FunAudioLLM/CosyVoice2-0.5B';
  // 默认使用的语音
  private defaultVoice: string = 'FunAudioLLM/CosyVoice2-0.5B:alex';

  /**
   * 构造函数
   */
  private constructor() {
    console.log('初始化TTSService');
    // 预加载语音
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
    // 初始化音频元素
    this.audio = new Audio();
    this.audio.onended = () => {
      this.isPlaying = false;
      this.currentMessageId = null;
    };
    this.audio.onerror = () => {
      console.error('音频播放错误');
      this.isPlaying = false;
      this.currentMessageId = null;
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  /**
   * 设置硅基流动API密钥
   * @param apiKey API密钥
   */
  public setApiKey(apiKey: string): void {
    this.siliconFlowApiKey = apiKey;
  }

  /**
   * 设置默认语音模型和音色
   * @param model 模型名称
   * @param voice 语音名称
   */
  public setDefaultVoice(model: string, voice: string): void {
    if (model) {
      this.defaultModel = model;
    }
    if (voice) {
      this.defaultVoice = voice;
    }
  }

  /**
   * 停止当前播放
   */
  public stop(): void {
    // 停止Audio元素播放
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }

    // 停止Web Speech API播放
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    this.isPlaying = false;
    this.currentMessageId = null;
    
    // 释放Blob URL
    if (this.currentAudioBlob) {
      URL.revokeObjectURL(this.currentAudioBlob);
      this.currentAudioBlob = null;
    }
  }

  /**
   * 获取播放状态
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * 获取当前播放的消息ID
   */
  public getCurrentMessageId(): string | null {
    return this.currentMessageId;
  }

  /**
   * 切换播放状态
   * @param messageId 消息ID
   * @param text 要播放的文本
   * @param voice 语音名称
   * @returns 是否正在播放
   */
  public async togglePlayback(messageId: string, text: string, voice: string = this.defaultVoice): Promise<boolean> {
    // 如果当前正在播放此消息，则停止播放
    if (this.isPlaying && this.currentMessageId === messageId) {
      this.stop();
      return false;
    }
    
    // 如果正在播放其他消息，先停止
    if (this.isPlaying) {
      this.stop();
    }
    
    // 开始播放新消息
    const success = await this.speak(text, voice);
    if (success) {
      this.currentMessageId = messageId;
    }
    return success;
  }

  /**
   * 播放文本
   * @param text 要播放的文本
   * @param voice 语音名称，不指定则使用默认语音
   * @returns 是否成功开始播放
   */
  public async speak(text: string, voice: string = this.defaultVoice): Promise<boolean> {
    try {
      // 如果正在播放，先停止
      if (this.isPlaying) {
        this.stop();
      }

      // 确保文本不为空
      if (!text || text.trim() === '') {
        console.error('文本为空，无法播放');
        return false;
      }

      console.log(`开始播放文本，语音: ${voice}`);
      this.isPlaying = true;

      // 首先尝试使用硅基流动API
      if (await this.speakWithSiliconFlow(text, voice)) {
        return true;
      }

      // 如果硅基流动API失败，尝试使用Web Speech API
      if (this.speakWithWebSpeechAPI(text, voice)) {
        return true;
      }

      // 如果所有方法都失败
      console.warn('所有TTS方法播放失败');
      this.isPlaying = false;
      return false;
    } catch (error) {
      console.error('播放文本失败:', error);
      this.isPlaying = false;
      this.currentMessageId = null;
      return false;
    }
  }

  /**
   * 使用硅基流动API播放文本
   * @param text 要播放的文本
   * @param voiceName 语音名称
   * @returns 是否成功播放
   */
  private async speakWithSiliconFlow(text: string, voiceName: string): Promise<boolean> {
    try {
      // 检查API密钥是否已设置
      if (!this.siliconFlowApiKey) {
        console.warn('硅基流动API密钥未设置，尝试其他方法');
        return false;
      }

      // 准备API请求参数
      const url = 'https://api.siliconflow.cn/v1/audio/speech';
      const model = this.defaultModel;
      const voice = voiceName || this.defaultVoice;
      
      const requestBody = {
        model: model,
        input: text,
        voice: voice,
        response_format: 'mp3'
      };

      // 发送API请求
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.siliconFlowApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // 检查响应状态
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('硅基流动API请求失败:', response.status, errorData);
        return false;
      }

      // 获取音频数据
      const audioBlob = await response.blob();
      
      // 释放之前的Blob URL
      if (this.currentAudioBlob) {
        URL.revokeObjectURL(this.currentAudioBlob);
      }
      
      // 创建新的Blob URL
      this.currentAudioBlob = URL.createObjectURL(audioBlob);
      
      // 播放音频
      if (this.audio) {
        this.audio.src = this.currentAudioBlob;
        this.audio.play();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('硅基流动API播放失败:', error);
      return false;
    }
  }

  /**
   * 使用Web Speech API播放文本
   * @param text 要播放的文本
   * @param voiceName 语音名称
   * @returns 是否成功播放
   */
  private speakWithWebSpeechAPI(text: string, voiceName: string): boolean {
    try {
      // 检查浏览器是否支持Web Speech API
      if (!('speechSynthesis' in window)) {
        console.error('浏览器不支持Web Speech API');
        return false;
      }

      // 取消当前正在播放的语音
      window.speechSynthesis.cancel();

      // 创建语音合成器实例
      const utterance = new SpeechSynthesisUtterance(text);
      
      // 获取可用的语音合成声音
      let voices = window.speechSynthesis.getVoices();
      console.log('可用的语音合成声音:', voices);
      
      // 如果voices为空，可能是因为还没有加载完成
      if (voices.length === 0) {
        // 设置一个超时，等待语音加载
        setTimeout(() => {
          voices = window.speechSynthesis.getVoices();
          this.setVoiceAndPlay(utterance, voices, voiceName);
        }, 100);
        return true;
      }
      
      // 如果已有voices，直接设置并播放
      return this.setVoiceAndPlay(utterance, voices, voiceName);
    } catch (error) {
      console.error('Web Speech API播放失败:', error);
      this.isPlaying = false;
      return false;
    }
  }
  
  /**
   * 设置语音并播放
   * @param utterance SpeechSynthesisUtterance 实例
   * @param voices 可用的语音列表
   * @param voiceName 语音名称
   * @returns 是否成功播放
   */
  private setVoiceAndPlay(utterance: SpeechSynthesisUtterance, voices: SpeechSynthesisVoice[], voiceName: string): boolean {
    try {
      // 查找指定的语音
      let selectedVoice = voices.find((v) => v.name === voiceName);

      // 如果没有找到指定的语音，尝试使用中文语音
      if (!selectedVoice) {
        console.warn('未找到指定的语音:', voiceName);
        // 尝试找中文语音
        selectedVoice = voices.find((v) => v.lang === 'zh-CN');

        if (selectedVoice) {
          console.log('使用替代中文语音:', selectedVoice.name);
        } else if (voices.length > 0) {
          // 如果没有中文语音，使用第一个可用的语音
          selectedVoice = voices[0];
          console.log('使用第一个可用的语音:', selectedVoice.name);
        } else {
          console.warn('没有可用的语音');
          this.isPlaying = false;
          return false;
        }
      } else {
        console.log('使用指定语音:', selectedVoice.name);
      }

      // 设置语音
      utterance.voice = selectedVoice;
      
      // 设置其他可选参数
      utterance.rate = 1; // 语速
      utterance.pitch = 1; // 音调
      utterance.volume = 1; // 音量

      // 设置事件处理程序
      utterance.onend = () => {
        console.log('语音播放结束');
        this.isPlaying = false;
        this.currentMessageId = null;
      };

      utterance.onerror = (event) => {
        console.error('语音播放错误:', event);
        this.isPlaying = false;
        this.currentMessageId = null;
      };

      // 开始语音合成
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (error) {
      console.error('设置语音失败:', error);
      this.isPlaying = false;
      return false;
    }
  }
} 