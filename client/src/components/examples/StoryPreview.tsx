import StoryPreview from '../StoryPreview';
import sampleImage from "@assets/generated_images/Sample_storybook_page_illustration_9b27cb31.png";

export default function StoryPreviewExample() {
  // todo: remove mock functionality
  const mockStory = {
    id: '1',
    title: 'The Magical Forest Adventure',
    author: 'Sarah & Emma',
    pages: [
      {
        id: '1',
        pageNumber: 1,
        text: 'Once upon a time, in a magical forest filled with talking animals and sparkling streams, there lived a brave little rabbit named Benny. Benny had the softest brown fur and the biggest, kindest heart in all the woodland.',
        imagePrompt: 'A cute cartoon rabbit with brown fur wearing a red vest, standing in a magical forest',
        imageUrl: sampleImage
      },
      {
        id: '2',
        pageNumber: 2,
        text: 'One sunny morning, Benny heard a cry for help echoing through the trees. "Someone needs my help!" he said, hopping quickly toward the sound. His little heart was beating fast with excitement and worry.',
        imagePrompt: 'The rabbit looking concerned and alert, hopping through sunny forest paths',
        imageUrl: sampleImage
      },
      {
        id: '3',
        pageNumber: 3,
        text: 'Deep in the forest, Benny found a family of field mice trapped under a fallen branch. "Don\'t worry," said Benny bravely, "I\'ll help you!" He pushed and pushed with all his might until the branch rolled away.',
        imagePrompt: 'The rabbit helping mice trapped under a fallen branch in the forest',
        imageUrl: sampleImage
      }
    ]
  };

  return (
    <div className="max-w-6xl">
      <StoryPreview 
        story={mockStory}
        onEdit={() => console.log('Edit story clicked')}
        onDownload={(format) => console.log('Download', format)}
        onShare={() => console.log('Share story clicked')}
      />
    </div>
  );
}