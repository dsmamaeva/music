/**
 * @fileoverview Control real time music with a MIDI controller
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PlaybackState, Prompt } from './types';
import { GoogleGenAI, LiveMusicFilteredPrompt } from '@google/genai';
import { PromptDjMidi } from './components/PromptDjMidi';
import { ToastMessage } from './components/ToastMessage';
import { LiveMusicHelper } from './utils/LiveMusicHelper';
import { AudioAnalyser } from './utils/AudioAnalyser';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'lyria-realtime-exp';

function main() {
  const initialPrompts = buildInitialPrompts();

  const pdjMidi = new PromptDjMidi(initialPrompts);
  document.body.appendChild(pdjMidi as unknown as Node);

  const toastMessage = new ToastMessage();
  document.body.appendChild(toastMessage as unknown as Node);

  const liveMusicHelper = new LiveMusicHelper(ai, model);
  liveMusicHelper.setWeightedPrompts(initialPrompts);

  const audioAnalyser = new AudioAnalyser(liveMusicHelper.audioContext);
  liveMusicHelper.extraDestination = audioAnalyser.node;

  (pdjMidi as unknown as EventTarget).addEventListener('prompts-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<Map<string, Prompt>>;
    const prompts = customEvent.detail;
    liveMusicHelper.setWeightedPrompts(prompts);
  }));

  (pdjMidi as unknown as EventTarget).addEventListener('play-pause', () => {
    liveMusicHelper.playPause();
  });

  liveMusicHelper.addEventListener('playback-state-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<PlaybackState>;
    const playbackState = customEvent.detail;
    pdjMidi.playbackState = playbackState;
    playbackState === 'playing' ? audioAnalyser.start() : audioAnalyser.stop();
  }));

  liveMusicHelper.addEventListener('filtered-prompt', ((e: Event) => {
    const customEvent = e as CustomEvent<LiveMusicFilteredPrompt>;
    const filteredPrompt = customEvent.detail;
    toastMessage.show(filteredPrompt.filteredReason!)
    pdjMidi.addFilteredPrompt(filteredPrompt.text!);
  }));

  const errorToast = ((e: Event) => {
    const customEvent = e as CustomEvent<string>;
    const error = customEvent.detail;
    toastMessage.show(error);
  });

  liveMusicHelper.addEventListener('error', errorToast);
  (pdjMidi as unknown as EventTarget).addEventListener('error', errorToast);

  audioAnalyser.addEventListener('audio-level-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<number>;
    const level = customEvent.detail;
    pdjMidi.audioLevel = level;
  }));

}

function buildInitialPrompts() {
  // Start with a specific mood for the LVT video: 
  // Industrial Hum (Foundation) + Scientific Ambient (Atmosphere) + Precision Rhythm (Motion)
  const startIndices = [0, 1, 2];

  const prompts = new Map<string, Prompt>();

  for (let i = 0; i < DEFAULT_PROMPTS.length; i++) {
    const promptId = `prompt-${i}`;
    const prompt = DEFAULT_PROMPTS[i];
    const { text, color } = prompt;
    prompts.set(promptId, {
      promptId,
      text,
      weight: startIndices.includes(i) ? 1 : 0,
      cc: i,
      color,
    });
  }

  return prompts;
}

const DEFAULT_PROMPTS = [
  // Core Vibe
  { color: '#607D8B', text: 'Soft Industrial Hum' },
  { color: '#00BCD4', text: 'Scientific Ambient' },
  { color: '#9E9E9E', text: 'Precision Rhythm' },
  
  // Heat / Furnace Themes
  { color: '#FF5722', text: 'Warm Analog Pad' },
  { color: '#FF9800', text: 'Glowing Heat' },
  { color: '#FFC107', text: 'Thermal Energy' },
  
  // Materials & Texture
  { color: '#78909C', text: 'Metallic Texture' },
  { color: '#8D6E63', text: 'Ceramic Resonance' },
  
  // Process & Motion
  { color: '#4CAF50', text: 'Steady Pulse' },
  { color: '#CDDC39', text: 'Automated Machinery' },
  { color: '#009688', text: 'Fluid Process' },
  
  // Cinematic / Corporate
  { color: '#3F51B5', text: 'Innovation Future' },
  { color: '#2196F3', text: 'Clean Corporate' },
  { color: '#673AB7', text: 'Deep Bass Drone' },
  { color: '#E91E63', text: 'Ethereal Glow' },
  { color: '#9C27B0', text: 'Research Lab' },
];

main();