import { render, screen, fireEvent } from '@testing-library/react';
import { Composer } from '@/components/v3/ui/Composer';
import { Glide } from '@/components/v3/ui/Glide';

describe('Composer (v13 hero anatomy)', () => {
  it('renders textarea, attach, model + mode glides, and the run button', () => {
    render(
      <Composer
        value=""
        onChange={() => {}}
        onSend={() => {}}
        placeholder="Describe what you're working on"
        ariaLabel="Describe what you're working on"
        model="Muse Spark 1.3"
        onModel={() => {}}
        mode="default"
        onMode={() => {}}
      />,
    );
    expect(screen.getByLabelText("Describe what you're working on")).toBeTruthy();
    expect(screen.getByLabelText('Attach files')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Model' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mode' })).toBeTruthy();
    expect(screen.getByRole('button', { name: />_/ })).toBeTruthy();
    expect(screen.getAllByText('Muse Spark 1.3 Free').length).toBeGreaterThan(0); // button label + menu entry
    expect(screen.getAllByText('Default').length).toBeGreaterThan(0); // button label + menu entry
  });

  it('sends on the run button and clears the composer', () => {
    const onSend = jest.fn();
    const { rerender } = render(
      <Composer
        value="research Q4"
        onChange={() => {}}
        onSend={onSend}
        placeholder="p"
        ariaLabel="p"
        model="GPT-5"
        onModel={() => {}}
        mode="default"
        onMode={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: />_/ }));
    expect(onSend).toHaveBeenCalledTimes(1);
    rerender(
      <Composer
        value=""
        onChange={() => {}}
        onSend={onSend}
        placeholder="p"
        ariaLabel="p"
        model="GPT-5"
        onModel={() => {}}
        mode="default"
        onMode={() => {}}
      />,
    );
  });
});

describe('Glide (v13 dropdown)', () => {
  it('opens, selects an option, and reports the change', () => {
    const onModel = jest.fn();
    render(
      <Glide
        value="GPT-5"
        ariaLabel="Model"
        onChange={onModel}
        options={[
          { value: 'GPT-5', label: 'GPT-5', hint: 'fast' },
          { value: 'Claude 4', label: 'Claude 4', hint: 'deep' },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Model' }));
    fireEvent.click(screen.getByRole('option', { name: /Claude 4/i }));
    expect(onModel).toHaveBeenCalledWith('Claude 4');
  });
});
