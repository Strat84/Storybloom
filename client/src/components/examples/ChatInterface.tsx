import ChatInterface from '../ChatInterface';

export default function ChatInterfaceExample() {
  return (
    <div className="max-w-2xl">
      <ChatInterface onStoryGenerated={(story) => console.log('Story generated:', story)} />
    </div>
  );
}