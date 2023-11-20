const changelog = [
  {
    version: '1.1.1',
    emoji: '👘',
    date: '2023-11-20',
    changes: ['Refactor the gas calculation logic on sell process'],
  },
  {
    version: '1.1.0',
    emoji: '🏊🏻‍♀️',
    date: '2023-11-17',
    changes: [
      'More ui polishing',
      'Fix a bug that causes adding liquidity to has incorrect price',
      'Refactor the logic of liquidity selection',
      'Add more multiplier options for liquidity selection',
      'Add dollar representation for assets',
      'Add BTC/satoshis representation switch for assets',
    ],
  },
  {
    version: '1.0.6',
    emoji: '👻',
    date: '2023-11-15',
    changes: [
      'More ui polishing',
      'Show liquidity use tx in pool release page',
      'Prettify liquidity selection panel in bid page',
      'Show estimated bid miner fee in network state panel',
    ],
  },
  {
    version: '1.0.5',
    emoji: '🍒',
    date: '2023-11-14',
    changes: ['Add a new network status panel to globally set fee rate'],
  },
  {
    version: '1.0.4',
    emoji: '🐛',
    date: '2023-11-13',
    changes: ['Fix some precision issues'],
  },
  {
    version: '1.0.3',
    emoji: '🐛',
    date: '2023-11-13',
    changes: ['Fix a bug that causes taproot address to be unable to use'],
  },
  {
    version: '1.0.2',
    emoji: '📚',
    date: '2023-11-06',
    changes: [
      'Switch to satoshis instead of BTC as the default unit for better precision',
    ],
  },
  {
    version: '1.0.1',
    emoji: '🏄‍♂️',
    date: '2023-11-06',
    changes: ['Do some error message polishing'],
  },
  {
    version: '1.0.0',
    emoji: '🎉',
    date: '2023-10-24',
    changes: [
      'Finally, the first version of Orders.Exchange is released!',
      'Hell yeah!',
    ],
  },
  {
    version: '0.8.0',
    emoji: '🐳',
    date: '2023-10-07',
    changes: [
      'Introduce liquidity pool feature',
      'Add bidirectional liquidity support',
      'Fix various bugs',
    ],
  },
  {
    version: '0.7.0',
    emoji: '🃏',
    date: '2023-09-01',
    changes: [
      '(Almost) Final draft of pool feature',
      'Use a more accurate way to calculate fee',
      'Add taproot support',
    ],
  },
  {
    version: '0.6.2',
    emoji: '🐊',
    date: '2023-08-24',
    changes: [
      'Third draft of pool feature',
      'Finish main workflow of pool feature',
    ],
  },
  {
    version: '0.6.1',
    emoji: '🌊',
    date: '2023-08-03',
    changes: [
      'Second draft of pool feature',
      'Add remove and claim page to pool feature',
      'Build a nicer README page',
    ],
  },
  {
    version: '0.6.0',
    emoji: '🏊‍♂️',
    date: '2023-06-30',
    changes: ['First draft of pool feature'],
  },
  {
    version: '0.5.3',
    emoji: '🤨',
    date: '2023-06-29',
    changes: ['Add changelog'],
  },

  {
    version: '0.5.2',
    emoji: '🎣',
    date: '2023-06-28',
    changes: ['Add a whitelist page', 'Add a header navbar'],
  },
]

export default changelog
