export default function selectStories(stories) {
    const selectedStories = [];
    for (const group of stories) {
        for (const story of group.stories) {
            const name = `${group.kind}: ${story.name}`;
            const encodedParams = `selectedKind=${encodeURIComponent(group.kind)}` +
                `&selectedStory=${encodeURIComponent(story.name)}`;

            selectedStories.push({
                name,
                encodedParams
            });
        }
    }
    return selectedStories;
}
