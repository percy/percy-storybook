import PromisePool from 'es6-promise-pool';
import uploadStory from './uploadStory';

const concurrency = 5;

export default function uploadStories(percyClient, build, stories, widths, minimumHeight, assets, storyHtml) {
  function* generatePromises() {
    for (const story of stories) {
      yield uploadStory(percyClient, build, story, widths, minimumHeight, assets, storyHtml);
    }
  }

  const pool = new PromisePool(generatePromises(), concurrency);
  return pool.start();
}
