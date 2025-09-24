import StoryPageEditor from '../StoryPageEditor';
import sampleImage from "@assets/generated_images/Sample_storybook_page_illustration_9b27cb31.png";

export default function StoryPageEditorExample() {
  const mockPage = {
    id: '1',
    pageNumber: 1,
    text: 'Once upon a time, in a magical forest filled with talking animals and sparkling streams, there lived a brave little rabbit named Benny. Benny had the softest brown fur and the biggest, kindest heart in all the woodland.',
    imagePrompt: 'A cute cartoon rabbit with brown fur wearing a red vest, standing in a magical forest with colorful mushrooms, friendly woodland creatures, and sparkling fairy lights in the trees. Warm, inviting children\'s book illustration style.',
    imageUrl: sampleImage
  };

  return (
    <div className="max-w-4xl">
      <StoryPageEditor 
        page={mockPage}
        onPageUpdate={(page) => console.log('Page updated:', page)}
        onRegenerateImage={(id) => console.log('Regenerate image for:', id)}
      />
    </div>
  );
}