// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Philipp Emanuel Weidmann <pew@worldwidemann.com>

import { Box, RadioCards, Text } from "@radix-ui/themes";
import ImageOption from "@/components/ImageOption";
import WizardStep from "@/components/WizardStep";
import { useShallow } from "zustand/shallow";
import { type Genre, useStateStore } from "@/lib/state";

export default function GenreSelect({ onNext, onBack }: { onNext?: () => void; onBack?: () => void }) {
    const { genre, setState } = useStateStore(
      useShallow((state) => ({
        genre: state.genre,
        setState: state.set,
      })),
    );
    
  return (
    <WizardStep title="Genre" onNext={onNext} onBack={onBack}>
      <RadioCards.Root defaultValue="fantasy" columns="3" value={genre}
              onValueChange={(value: Genre) =>
                setState((state) => {
                  state.genre = value;
                })
              }>
        <ImageOption title="Fantasy" description="Elves, dwarves, and wizards" image="fantasy" value="fantasy" />
        <ImageOption title="Sci-Fi" description="Spaceships and aliens" image="scifi" value="scifi" disabled />
        <ImageOption title="Reality" description="Dust and grime" image="reality" value="reality" />
      </RadioCards.Root>
    </WizardStep>
  );
}
