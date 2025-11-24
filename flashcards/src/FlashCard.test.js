import { render, screen } from '@testing-library/react';
import FlashCard from './FlashCard';
import { SettingsProvider } from './SettingsContext';

// Mock react-katex to avoid issues with KaTeX in tests
jest.mock('react-katex', () => ({
  InlineMath: ({ math }) => <span data-testid="math">{math}</span>
}));

const renderFlashCard = (props) => {
  return render(
    <SettingsProvider>
      <FlashCard {...props} />
    </SettingsProvider>
  );
};

test('renders multi-line text correctly', () => {
  const props = {
    front: 'Line 1\nLine 2',
    back: 'Back',
    datasetName: 'test',
    isFlipped: false,
    setIsFlipped: jest.fn(),
    isTransitioning: false,
    spellMode: false,
    textRevealed: true,
    setTextRevealed: jest.fn(),
  };

  renderFlashCard(props);

  // Check if both lines are rendered
  expect(screen.getByText('Line 1')).toBeInTheDocument();
  expect(screen.getByText('Line 2')).toBeInTheDocument();
});

test('renders multi-line text with math correctly', () => {
  const props = {
    front: 'Line 1\n$x^2$',
    back: 'Back',
    datasetName: 'test',
    isFlipped: false,
    setIsFlipped: jest.fn(),
    isTransitioning: false,
    spellMode: false,
    textRevealed: true,
    setTextRevealed: jest.fn(),
  };

  renderFlashCard(props);

  expect(screen.getByText('Line 1')).toBeInTheDocument();
  expect(screen.getByTestId('math')).toHaveTextContent('x^2');
});

test('renders multi-line text with literal \\n characters correctly', () => {
  const props = {
    front: 'Line 1\\nLine 2', // Literal \n as it appears in CSV
    back: 'Back',
    datasetName: 'test',
    isFlipped: false,
    setIsFlipped: jest.fn(),
    isTransitioning: false,
    spellMode: false,
    textRevealed: true,
    setTextRevealed: jest.fn(),
  };

  renderFlashCard(props);

  expect(screen.getByText('Line 1')).toBeInTheDocument();
  expect(screen.getByText('Line 2')).toBeInTheDocument();
});
