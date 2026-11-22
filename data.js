/* ------------------------------------------------------------------
   I FEEL MORE THAN I SAY. — site content
   Edit THIS file to update the website. No other code needs to change.

   ANSWERS (the floating bubbles around each question)
   Each situation has an `answers` list. Hovering a bubble opens it into a card
   that shows one answer. Right now they hold SAMPLE text (flagged "sample").
   To use real, consented responses, replace the list with:
        { text: 'The full anonymised answer…' }
   and remove `sample: true`. Only publish responses with separate consent.
   If a situation has fewer answers than bubbles, the remaining bubbles stay
   as quiet placeholders.

   POSTERS
   poster.image: 'assets/posters/F01.jpg'  (leave null for the typographic placeholder)

   SHIRTS
   shirts[i].orderUrl: link to your order form / shop. (null shows "Coming soon").
------------------------------------------------------------------- */

const sampleAnswers = [
  'I feel so sad and disappointed because they cannot understand what I feel.',
  'I want to say it, but the words never come out.',
  'Sometimes I just wish someone would ask.',
  'I smile, but I am tired of pretending.',
  'Maybe I am not saying enough either.',
  'It hurts more than I let people see.',
  'I wish they could see how hard I try.',
  'I am learning to be kinder to myself.',
  'Saying it out loud feels scary, but also like relief.',
].map((text) => ({ text, sample: true }));

window.SITE = {
  themes: {
    relationship: { label: 'Relationships' },
    self: { label: 'Self and Social Expectations' },
  },

  situations: [
    {
      id: 'F01', theme: 'relationship', title: 'Comparison',
      question: 'Your parents compare you to your peers when your results fall short of theirs.',
      // writing area on the back of the card, as % of the card (x, y, width, height) and line height in px @656w
      write: { x: 10.5, y: 46, w: 80, h: 44, lh: 24, color: '#302D43' },
      poster: { word: 'Compared.', image: null, caption: null },
      answers: sampleAnswers,
    },
    {
      id: 'F02', theme: 'relationship', title: 'Hidden struggle',
      question: 'They’re going through a lot but hiding it from you.',
      write: { x: 17, y: 46, w: 69, h: 49, lh: 25, color: '#302D43' },
      poster: { word: 'Hiding it.', image: null, caption: null },
      answers: sampleAnswers,
    },
    {
      id: 'S01', theme: 'self', title: 'Comparing yourself',
      question: 'Despite being the same age, you feel you fall short of your peers—even in the areas where you’re supposed to be the most skilled.',
      write: { x: 6.9, y: 61, w: 86, h: 30, lh: 33, color: '#302D43' },
      poster: { word: 'Falling short.', image: null, caption: null },
      answers: sampleAnswers,
    },
    {
      id: 'S02', theme: 'self', title: 'Past & present self',
      question: 'You reflect on who you were in the past compared to who you are today.',
      write: { x: 12.8, y: 59, w: 71.5, h: 29, lh: 26, color: '#302D43' },
      poster: { word: 'Then. Now.', image: null, caption: null },
      answers: sampleAnswers,
    },
  ],

  shirts: [
    { name: 'Family blue',  image: 'assets/art/shirt-1.png', orderUrl: null, price: '100.000vnd' },
    { name: 'Friendship',   image: 'assets/art/shirt-2.png', orderUrl: null, price: '100.000vnd' },
    { name: 'Love blush',   image: 'assets/art/shirt-3.png', orderUrl: null, price: '100.000vnd' },
    { name: 'Self violet',  image: 'assets/art/shirt-4.png', orderUrl: null, price: '100.000vnd' },
  ],
};
