// ASCII art: the "tech" half of tech-meets-nature. Plain characters, set in a monospace face.

// A tomato plant in eight stages, seed to fruit (used by the scroll story)
export const GROW = [
`


         .
   ~~~~~~~~~~~~~~~`,
`


         ,
        (.)
   ~~~~~~~~~~~~~~~`,
`


       \\ | /
        \\|/
   ~~~~~~|~~~~~~~~`,
`

      _\\ | /_
     (_ \\|/ _)
        \\|/
   ~~~~~~|~~~~~~~~`,
`    \\  \\|/  /
   _\\\\ \\|/ //_
  (__ \\\\|// __)
     \\_ | _/
       \\|/
   ~~~~~|~~~~~~~~`,
`    \\  \\|/  * /
  * _\\\\ \\|/ //_
  (__ \\\\|// __)*
   *  \\_ | _/
       \\|/
   ~~~~~|~~~~~~~~`,
`    \\  \\|/  o /
  o _\\\\ \\|/ //_
  (__ \\\\|// __)o
   o  \\_ | _/
       \\|/  o
   ~~~~~|~~~~~~~~`,
`    \\  \\|/  @ /
  @ _\\\\ \\|/ //_
  (__ \\\\|// __)@
   @  \\_ | _/  @
    @  \\|/  @
   ~~~~~|~~~~~~~~`,
];

export const CAN = String.raw`     _____
  __/  o  \___ .
 /  |       |  \ ' .
|   |  H2O  |   ) . '
 \__|_______|__/  '`;

export const LORRY = String.raw` ____________________ __
|   FRESH PRODUCE    |  \__
|____________________|_ [_]\
 (o)(o)        (o)(o)  (o)`;

export const POT = String.raw`   \|/
  --|--
 \_____/
  \___/`;

export const TREE = String.raw`            .  *  .
        *  ( o ) ( * )  .
      ( * )( o )( * )( o )
     ( o )( * )( o )( * )( o )
      ( * )( o )\|/( o )( * )
         ( o ) \ | / ( * )
               \|/
                |
                |
           ___ /|\ ___`;

export const SPROUT = String.raw`  \ /
 --o--
   |
 __|__`;

export const LEAF_LINE = '~`~,~`~,~`~,~`~,~`~,~`~,~`~,~`~,~`~,~`~,~`~,~`~,~`~,~`~,~`~,~`~,~`~,~`~,~`~,~`~,~`~';

// Robot faces for the pot, by mood
export const FACES = {
  thriving: { eyes: '^   ^', mouth: '\\___/', word: 'Thriving' },
  happy:    { eyes: 'o   o', mouth: '\\___/', word: 'Happy' },
  okay:     { eyes: 'o   o', mouth: ' ___ ', word: 'Doing okay' },
  thirsty:  { eyes: 'o   o', mouth: ' ~~~ ', word: 'A bit droopy' },
  poorly:   { eyes: ';   ;', mouth: ' /^\\ ', word: 'Needs help' },
  sleepy:   { eyes: '-   -', mouth: ' ___ ', word: 'Waiting for today\'s photo' },
  new:      { eyes: 'o   o', mouth: '  o  ', word: 'Just planted' },
};

// A tiny loading spinner made of leaves
export const SPIN = ['.  ', '.. ', '...', ' ..', '  .', '   '];
