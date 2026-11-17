import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
  InterstitialAdPluginEvents,
  NativeAdFeed,
  NativeAdTemplate,
} from '@capacitor-community/admob';

// ---------------------------------------------------------------
// 1) PASTE YOUR NATIVE AD UNIT ID HERE (create it in AdMob:
//    Apps > your app > Ad units > Add ad unit > Native advanced)
// ---------------------------------------------------------------
const NATIVE_AD_UNIT_ID = 'PASTE_NATIVE_AD_UNIT_ID_HERE';

// Interstitial used for the "after you open the app" ad
const INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-7675714255330333/3881657723';
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';

export const FEED_ID = 'love-that-ads';
export const ADS_EVERY = 10;

const isNative = Capacitor.isNativePlatform();
const isDev = typeof import.meta !== 'undefined' && !!import.meta.env && !!import.meta.env.DEV;
const nativeIdMissing = NATIVE_AD_UNIT_ID.startsWith('PASTE_');
const useTestAds = isDev || nativeIdMissing;

let started = false;
let feed = null;
let interstitialLoaded = false;

async function loadInterstitial() {
  try {
    await AdMob.prepareInterstitial({
      adId: isDev ? TEST_INTERSTITIAL_ID : INTERSTITIAL_AD_UNIT_ID,
      isTesting: isDev,
    });
    interstitialLoaded = true;
  } catch (e) {
    interstitialLoaded = false;
    console.warn('Interstitial failed to load', e);
  }
}

// Call ONCE when the app starts (consent -> initialize -> native feed -> app-open ad)
export async function initAds() {
  if (!isNative || started) return;
  started = true;
  try {
    let consent = await AdMob.requestConsentInfo();
    if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
      consent = await AdMob.showConsentForm();
    }
    if (!consent.canRequestAds) return;

    await AdMob.initialize();

    feed = await NativeAdFeed.create({
      feedId: FEED_ID,
      template: NativeAdTemplate.Medium,
      adId: nativeIdMissing ? undefined : NATIVE_AD_UNIT_ID,
      isTesting: useTestAds,
      style: { cornerRadius: 16 },
    });

    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      interstitialLoaded = false;
    });

    // Ad after opening the app
    await loadInterstitial();
    if (interstitialLoaded) await AdMob.showInterstitial();
  } catch (e) {
    console.warn('Ads init failed', e);
    started = false;
  }
}

export function pauseAds() { return feed ? feed.pause() : Promise.resolve(); }
export function resumeAds() { if (feed) feed.resume(); }

// Simple counters: returns true on every 10th call
function makeCounter(n) {
  let c = 0;
  return () => {
    c += 1;
    if (c >= n) { c = 0; return true; }
    return false;
  };
}
export const countRightSwipe = makeCounter(ADS_EVERY); // profiles
export const countShortSwipe = makeCounter(ADS_EVERY); // shorts
