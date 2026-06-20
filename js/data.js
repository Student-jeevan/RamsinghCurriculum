/**
 * data.js — Default curriculum data for the Learning Dashboard
 * ES Module — provides factory functions that return fresh default data structures
 */

import { generateId } from './utils.js';

// ─── Helper: Create a topic entry ────────────────────────────────────────────

/**
 * Build a single topic object with sensible defaults.
 * @param {string} title - Topic title
 * @param {string} description - One-line description
 * @returns {Object} Topic data structure
 */
function topic(title, description = '') {
  return {
    id: generateId(),
    title,
    description,
    status: 'not-started',    // 'not-started' | 'in-progress' | 'completed' | 'revision'
    confidence: 0,             // 0–100
    practiceCount: 0,
    notes: '',
    resources: [],
    dateStarted: null,
    dateCompleted: null,
    revisionHistory: []        // Array of 'YYYY-MM-DD' strings
  };
}

/**
 * Build a module (chapter group) containing multiple topics.
 * @param {string} id - Unique module ID
 * @param {string} name - Module display name
 * @param {Array} topics - Array of topic objects
 * @returns {Object} Module data structure
 */
function mod(id, name, topics) {
  return { id, name, topics };
}

// ═════════════════════════════════════════════════════════════════════════════
//  DEFAULT CURRICULUM
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Returns a complete default curriculum with all tracks, modules, and topics.
 * Each call returns a fresh object with newly generated IDs.
 */
export function getDefaultCurriculum() {
  return {
    tracks: [

      // ─── Mathematics Track ──────────────────────────────────────────────
      {
        id: 'math',
        name: 'Mathematics',
        icon: '📐',
        color: 'var(--track-math)',
        colorRaw: '#6c5ce7',
        modules: [
          mod('math-algebra', 'Algebra', [
            topic('Functions', 'Types of functions, domain, range, composition'),
            topic('Mathematical Induction', 'Principle of induction, strong induction, applications'),
            topic('Complex Numbers', 'Algebra of complex numbers, Argand plane, De Moivre\'s theorem'),
            topic('Quadratic Expressions', 'Quadratic equations, nature of roots, max/min values'),
            topic('Theory of Equations', 'Relation between roots and coefficients, symmetric functions'),
            topic('Permutations & Combinations', 'Fundamental counting, nPr, nCr, applications'),
            topic('Binomial Theorem', 'Binomial expansion, general term, middle term, properties'),
            topic('Partial Fractions', 'Decomposition of rational expressions into partial fractions'),
            topic('Matrices', 'Types, operations, determinants, inverse, solving linear systems'),
          ]),

          mod('math-trigonometry', 'Trigonometry', [
            topic('Trigonometric Ratios', 'Ratios of compound angles, multiple and sub-multiple angles'),
            topic('Trigonometric Equations', 'General solutions, principal solutions, solving techniques'),
            topic('Inverse Trigonometric Functions', 'Domains, ranges, properties, identities'),
            topic('Hyperbolic Functions', 'sinh, cosh, tanh, identities and graphs'),
            topic('Properties of Triangles', 'Sine rule, cosine rule, area, circumradius, inradius'),
          ]),

          mod('math-coordinate', 'Coordinate Geometry', [
            topic('Locus', 'Definition, equation of locus, translation of geometric conditions'),
            topic('Transformation of Axes', 'Translation, rotation, shifting of origin'),
            topic('Straight Lines', 'Slope, equations, angle between lines, distance formulas'),
            topic('Pair of Straight Lines', 'Homogeneous equations, angle bisectors, conditions'),
            topic('Circles', 'Standard form, general form, tangents, normals, chord of contact'),
            topic('System of Circles', 'Radical axis, coaxial system, orthogonal circles'),
            topic('Parabola', 'Standard equations, focal chord, tangent, normal, applications'),
            topic('Ellipse', 'Standard equations, eccentricity, tangent, normal, auxiliary circle'),
            topic('Hyperbola', 'Standard equations, asymptotes, rectangular hyperbola'),
          ]),

          mod('math-calculus', 'Calculus', [
            topic('Limits & Continuity', 'Limit theorems, L\'Hôpital\'s rule, continuity tests'),
            topic('Differentiation', 'Rules, chain rule, implicit, parametric, higher order'),
            topic('Applications of Derivatives', 'Tangents, normals, maxima/minima, rate of change'),
            topic('Integration', 'Methods: substitution, by parts, partial fractions, reduction'),
            topic('Definite Integrals', 'Properties, area under curves, fundamental theorem'),
            topic('Differential Equations', 'Order, degree, separable, linear, homogeneous types'),
          ]),

          mod('math-vectors', 'Vectors & 3D', [
            topic('Addition of Vectors', 'Vector algebra, section formula, centroid, collinearity'),
            topic('Product of Vectors', 'Dot product, cross product, scalar triple product, applications'),
            topic('3D Coordinates', 'Distance, section formula, direction ratios in space'),
            topic('Direction Cosines', 'Direction cosines & ratios, angle between lines'),
            topic('Planes', 'Equation of plane, angle between planes, distance from point'),
          ]),
        ]
      },

      // ─── Programming (Python) Track ─────────────────────────────────────
      {
        id: 'programming',
        name: 'Programming (Python)',
        icon: '🐍',
        color: 'var(--track-prog)',
        colorRaw: '#00b894',
        modules: [
          mod('prog-basics', 'Python Basics', [
            topic('Variables & Data Types', 'int, float, str, bool, type(), dynamic typing'),
            topic('Operators', 'Arithmetic, comparison, logical, bitwise, assignment operators'),
            topic('Input/Output', 'print(), input(), formatted strings, f-strings'),
            topic('Type Conversion', 'Implicit and explicit type casting, int(), float(), str()'),
            topic('String Basics', 'Indexing, slicing, methods, immutability, concatenation'),
          ]),

          mod('prog-control', 'Control Flow', [
            topic('Conditional Statements', 'if, elif, else, nested conditions, ternary operator'),
            topic('For Loops', 'range(), iterating over sequences, enumerate(), zip()'),
            topic('While Loops', 'Condition-based looping, sentinel values, infinite loops'),
            topic('Break/Continue/Pass', 'Loop control statements and their use cases'),
            topic('Nested Loops', 'Patterns, matrix traversal, time complexity considerations'),
          ]),

          mod('prog-functions', 'Functions', [
            topic('Defining Functions', 'def keyword, naming conventions, docstrings'),
            topic('Parameters & Arguments', 'Positional, keyword, default, *args, **kwargs'),
            topic('Return Values', 'Single/multiple returns, None, early return patterns'),
            topic('Scope & Lifetime', 'Local, global, nonlocal, LEGB rule'),
            topic('Lambda Functions', 'Anonymous functions, map(), filter(), reduce()'),
            topic('Recursion', 'Base case, recursive case, stack depth, memoization'),
          ]),

          mod('prog-datastructures', 'Data Structures', [
            topic('Lists', 'Creation, methods, slicing, copying, list as stack'),
            topic('Tuples', 'Immutability, packing/unpacking, named tuples'),
            topic('Dictionaries', 'Key-value pairs, methods, dict comprehensions'),
            topic('Sets', 'Set operations, frozen sets, membership testing'),
            topic('List Comprehensions', 'Syntax, conditionals, nested comprehensions'),
            topic('Nested Data Structures', 'Lists of dicts, dicts of lists, JSON-like structures'),
          ]),

          mod('prog-files', 'File Handling & Modules', [
            topic('File Read/Write', 'open(), read modes, with statement, encoding'),
            topic('CSV Handling', 'csv module, reader, writer, DictReader, DictWriter'),
            topic('JSON Handling', 'json.loads(), json.dumps(), reading/writing JSON files'),
            topic('Importing Modules', 'import, from...import, as alias, __name__'),
            topic('Standard Library', 'os, sys, math, random, datetime, collections'),
            topic('Creating Modules', 'Module structure, __init__.py, packages'),
          ]),

          mod('prog-oop', 'OOP', [
            topic('Classes & Objects', 'Class definition, instantiation, attributes, methods'),
            topic('Constructors', '__init__, instance vs class attributes, self'),
            topic('Inheritance', 'Single, multiple, super(), method resolution order'),
            topic('Polymorphism', 'Method overriding, duck typing, abstract classes'),
            topic('Encapsulation', 'Public, protected, private, property decorators'),
            topic('Magic Methods', '__str__, __repr__, __len__, __eq__, operator overloading'),
          ]),

          mod('prog-advanced', 'Advanced Python', [
            topic('Decorators', 'Function decorators, @syntax, functools.wraps, class decorators'),
            topic('Generators', 'yield, generator expressions, lazy evaluation, send()'),
            topic('Iterators', 'Iterator protocol, __iter__, __next__, itertools'),
            topic('Error Handling', 'try/except/else/finally, custom exceptions, best practices'),
            topic('Regular Expressions', 're module, patterns, groups, findall, sub, compile'),
            topic('Virtual Environments', 'venv, pip, requirements.txt, dependency management'),
          ]),
        ]
      },

      // ─── CS Fundamentals Track ──────────────────────────────────────────
      {
        id: 'cs-fundamentals',
        name: 'CS Fundamentals',
        icon: '💻',
        color: 'var(--track-cs)',
        colorRaw: '#0984e3',
        modules: [
          mod('cs-numbers', 'Number Systems', [
            topic('Binary', 'Binary representation, conversion to/from decimal'),
            topic('Octal', 'Octal system, conversions, applications'),
            topic('Hexadecimal', 'Hex notation, conversions, use in computing'),
            topic('Conversions', 'Inter-base conversions, fractional parts'),
            topic('Binary Arithmetic', 'Addition, subtraction, multiplication, complements'),
          ]),

          mod('cs-digital', 'Digital Logic', [
            topic('Logic Gates', 'AND, OR, NOT, NAND, NOR, XOR, XNOR gates'),
            topic('Boolean Algebra', 'Laws, theorems, simplification, canonical forms'),
            topic('Karnaugh Maps', '2/3/4 variable K-maps, prime implicants, minimization'),
            topic('Combinational Circuits', 'Adders, subtractors, multiplexers, decoders, encoders'),
          ]),

          mod('cs-architecture', 'Computer Architecture', [
            topic('CPU Components', 'ALU, control unit, registers, data path'),
            topic('Memory Hierarchy', 'Registers, cache, RAM, secondary storage, virtual memory'),
            topic('Instruction Cycle', 'Fetch-decode-execute, pipelining basics'),
            topic('Assembly Basics', 'Mnemonics, addressing modes, simple programs'),
          ]),

          mod('cs-os', 'Operating Systems', [
            topic('Process Management', 'Process states, PCB, context switching, threads'),
            topic('Memory Management', 'Paging, segmentation, virtual memory, page replacement'),
            topic('File Systems', 'File organization, directory structures, allocation methods'),
            topic('Scheduling Algorithms', 'FCFS, SJF, Round Robin, priority scheduling'),
          ]),

          mod('cs-networking', 'Networking', [
            topic('OSI Model', 'Seven layers, functions, protocols at each layer'),
            topic('TCP/IP', 'Four-layer model, TCP vs UDP, three-way handshake'),
            topic('HTTP', 'Request/response, methods, status codes, HTTPS'),
            topic('DNS', 'Name resolution, hierarchy, record types, caching'),
            topic('IP Addressing', 'IPv4, subnetting, CIDR, IPv6 basics'),
          ]),

          mod('cs-databases', 'Databases', [
            topic('Relational Model', 'Relations, tuples, attributes, keys, constraints'),
            topic('SQL Basics', 'SELECT, INSERT, UPDATE, DELETE, JOINs, GROUP BY'),
            topic('Normalization', '1NF, 2NF, 3NF, BCNF, functional dependencies'),
            topic('ER Diagrams', 'Entities, relationships, cardinality, weak entities'),
            topic('Transactions', 'ACID properties, concurrency control, isolation levels'),
          ]),
        ]
      },

      // ─── Problem Solving Track ──────────────────────────────────────────
      {
        id: 'problem-solving',
        name: 'Problem Solving',
        icon: '🧩',
        color: 'var(--track-ps)',
        colorRaw: '#e17055',
        modules: [
          mod('ps-fundamentals', 'Fundamentals', [
            topic('Time & Space Complexity', 'Big-O notation, analysis of loops, amortized analysis'),
            topic('Arrays', 'Traversal, rotation, prefix sums, kadane\'s algorithm'),
            topic('Strings', 'Manipulation, pattern matching, anagrams, palindromes'),
            topic('Two Pointers', 'Opposite direction, same direction, fast/slow pointers'),
            topic('Sliding Window', 'Fixed and variable window, maximum/minimum subarrays'),
          ]),

          mod('ps-search-sort', 'Searching & Sorting', [
            topic('Linear Search', 'Sequential search, sentinel search, analysis'),
            topic('Binary Search', 'Iterative, recursive, search on answer, rotated arrays'),
            topic('Bubble Sort', 'Algorithm, optimized version, stability, complexity'),
            topic('Selection Sort', 'Algorithm, in-place sorting, comparison with others'),
            topic('Insertion Sort', 'Algorithm, adaptive nature, use in hybrid sorts'),
            topic('Merge Sort', 'Divide and conquer, merge procedure, stability, O(n log n)'),
            topic('Quick Sort', 'Partition schemes, pivot selection, worst case avoidance'),
          ]),

          mod('ps-datastructures', 'Data Structures', [
            topic('Stacks', 'LIFO, array/linked list implementation, applications'),
            topic('Queues', 'FIFO, circular queue, deque, priority queue'),
            topic('Linked Lists', 'Singly, doubly, circular, operations, cycle detection'),
            topic('Hash Tables', 'Hash functions, collision handling, load factor, applications'),
            topic('Trees', 'Binary tree, BST, traversals, height, balanced trees'),
            topic('Heaps', 'Min/max heap, heapify, priority queue, heap sort'),
            topic('Graphs', 'Representations, BFS, DFS, connected components'),
          ]),

          mod('ps-algorithms', 'Algorithms', [
            topic('Recursion', 'Recursive thinking, call stack, tree recursion, tail recursion'),
            topic('Backtracking', 'N-Queens, subset sum, permutations, constraint satisfaction'),
            topic('Greedy Algorithms', 'Activity selection, Huffman, fractional knapsack'),
            topic('Divide & Conquer', 'Master theorem, merge sort, closest pair, Strassen'),
            topic('Dynamic Programming Basics', 'Memoization, tabulation, Fibonacci, LCS, knapsack'),
          ]),

          mod('ps-practice', 'Practice Patterns', [
            topic('Pattern Recognition', 'Identifying problem types, mapping to known patterns'),
            topic('Problem Decomposition', 'Breaking complex problems into sub-problems'),
            topic('Edge Cases', 'Empty input, single element, large input, negative numbers'),
            topic('Optimization Techniques', 'Space-time trade-offs, pruning, early termination'),
          ]),
        ]
      },

      // ─── Board Exam Preparation Track ───────────────────────────────────
      {
        id: 'board-exam',
        name: 'Board Exam Preparation',
        icon: '🎓',
        color: 'var(--track-board)',
        colorRaw: '#fdcb6e',
        modules: [
          mod('board-math-ia', 'Mathematics IA', [
            topic('Functions (Board)', 'Types, domain, range — board exam perspective'),
            topic('Mathematical Induction (Board)', 'Standard proof problems for board exams'),
            topic('Matrices (Board)', 'Determinants, inverse, Cramer\'s rule — exam focus'),
            topic('Complex Numbers (Board)', 'Argand plane, modulus-argument — exam problems'),
            topic('Quadratic Expressions (Board)', 'Nature of roots, max/min — board pattern'),
            topic('Theory of Equations (Board)', 'Symmetric functions of roots — exam style'),
            topic('Permutations & Combinations (Board)', 'Counting problems — board exam level'),
            topic('Binomial Theorem (Board)', 'Expansion, general term — exam questions'),
            topic('Partial Fractions (Board)', 'Decomposition techniques — board focus'),
          ]),

          mod('board-math-ib', 'Mathematics IB', [
            topic('Locus (Board)', 'Equation of locus — standard exam problems'),
            topic('Transformation of Axes (Board)', 'Translation and rotation — board level'),
            topic('Straight Lines (Board)', 'All forms, concurrent lines — exam pattern'),
            topic('Pair of Straight Lines (Board)', 'Homogeneous equations — board problems'),
            topic('Circles (Board)', 'Tangent, normal, chord of contact — exam focus'),
            topic('System of Circles (Board)', 'Radical axis, orthogonal circles — board level'),
            topic('Parabola (Board)', 'Standard properties — exam questions'),
            topic('Ellipse (Board)', 'Eccentricity, tangent — board problems'),
            topic('Hyperbola (Board)', 'Asymptotes, conjugate — exam pattern'),
            topic('Limits & Continuity (Board)', 'Standard limits, continuity — board focus'),
            topic('Differentiation (Board)', 'All rules — board exam pattern'),
            topic('Applications of Derivatives (Board)', 'Tangent, maxima/minima — exam problems'),
          ]),

          mod('board-exam-strategy', 'Exam Strategy', [
            topic('Previous Year Analysis', 'Analyze question patterns from past 5 years'),
            topic('Important Questions', 'High-frequency questions identified from past papers'),
            topic('Time Management', 'Section-wise time allocation and attempt strategy'),
            topic('Revision Plan', 'Systematic revision schedule for all subjects'),
          ]),
        ]
      },

    ] // end tracks
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  TRACKER-SPECIFIC DEFAULT DATA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Default extra data for the Mathematics tracker.
 * Contains key formulas to memorize and problem count tracking.
 */
export function getDefaultMathExtra() {
  return {
    formulas: [
      // Algebra
      { id: generateId(), chapter: 'Algebra', name: 'Quadratic Formula', formula: 'x = (-b ± √(b²-4ac)) / 2a', memorized: false },
      { id: generateId(), chapter: 'Algebra', name: 'Sum of roots', formula: 'α + β = -b/a', memorized: false },
      { id: generateId(), chapter: 'Algebra', name: 'Product of roots', formula: 'αβ = c/a', memorized: false },
      { id: generateId(), chapter: 'Algebra', name: 'nPr', formula: 'n! / (n-r)!', memorized: false },
      { id: generateId(), chapter: 'Algebra', name: 'nCr', formula: 'n! / (r!(n-r)!)', memorized: false },
      { id: generateId(), chapter: 'Algebra', name: 'Binomial General Term', formula: 'T(r+1) = nCr · x^(n-r) · a^r', memorized: false },
      // Trigonometry
      { id: generateId(), chapter: 'Trigonometry', name: 'sin²θ + cos²θ', formula: 'sin²θ + cos²θ = 1', memorized: false },
      { id: generateId(), chapter: 'Trigonometry', name: 'sin(A+B)', formula: 'sinA·cosB + cosA·sinB', memorized: false },
      { id: generateId(), chapter: 'Trigonometry', name: 'cos(A+B)', formula: 'cosA·cosB − sinA·sinB', memorized: false },
      { id: generateId(), chapter: 'Trigonometry', name: 'Sine Rule', formula: 'a/sinA = b/sinB = c/sinC = 2R', memorized: false },
      { id: generateId(), chapter: 'Trigonometry', name: 'Cosine Rule', formula: 'c² = a² + b² − 2ab·cosC', memorized: false },
      // Coordinate Geometry
      { id: generateId(), chapter: 'Coordinate Geometry', name: 'Distance Formula', formula: '√((x₂-x₁)² + (y₂-y₁)²)', memorized: false },
      { id: generateId(), chapter: 'Coordinate Geometry', name: 'Section Formula', formula: '((mx₂+nx₁)/(m+n), (my₂+ny₁)/(m+n))', memorized: false },
      { id: generateId(), chapter: 'Coordinate Geometry', name: 'Circle General Form', formula: 'x² + y² + 2gx + 2fy + c = 0, r = √(g²+f²-c)', memorized: false },
      { id: generateId(), chapter: 'Coordinate Geometry', name: 'Parabola Standard', formula: 'y² = 4ax, focus (a,0), directrix x = -a', memorized: false },
      // Calculus
      { id: generateId(), chapter: 'Calculus', name: 'Power Rule', formula: 'd/dx(xⁿ) = n·x^(n-1)', memorized: false },
      { id: generateId(), chapter: 'Calculus', name: 'Product Rule', formula: 'd/dx(uv) = u·dv/dx + v·du/dx', memorized: false },
      { id: generateId(), chapter: 'Calculus', name: 'Chain Rule', formula: 'dy/dx = dy/du · du/dx', memorized: false },
      { id: generateId(), chapter: 'Calculus', name: 'Integration by Parts', formula: '∫u·dv = uv − ∫v·du', memorized: false },
      // Vectors
      { id: generateId(), chapter: 'Vectors', name: 'Dot Product', formula: 'a⃗·b⃗ = |a||b|cosθ = a₁b₁ + a₂b₂ + a₃b₃', memorized: false },
    ],
    problemCounts: {} // { chapterId: count }
  };
}

/**
 * Default extra data for the Programming tracker.
 * Contains projects, coding exercises, debug log, and code quality checklist.
 */
export function getDefaultProgExtra() {
  return {
    exercises: [], // { id, title, difficulty: 'easy'|'medium'|'hard', status: 'not-started'|'completed', description: '' }

    projects: [
      { id: generateId(), title: 'Calculator App', description: 'Build a CLI calculator with basic and scientific operations', status: 'not-started' },
      { id: generateId(), title: 'To-Do List', description: 'CLI to-do list with file storage and priority levels', status: 'not-started' },
      { id: generateId(), title: 'Quiz Game', description: 'Multiple choice quiz that reads questions from a file', status: 'not-started' },
      { id: generateId(), title: 'Student Grade Manager', description: 'Track and analyze student grades with statistics', status: 'not-started' },
      { id: generateId(), title: 'Web Scraper', description: 'Simple web scraper with requests and BeautifulSoup', status: 'not-started' },
      { id: generateId(), title: 'Personal Budget Tracker', description: 'Track income and expenses with monthly reports', status: 'not-started' },
    ],

    debugLog: [], // { id, date, bugType, description, resolution }

    codeQuality: [
      { id: 'cq1', name: 'Meaningful variable names', checked: false },
      { id: 'cq2', name: 'Functions are small and focused', checked: false },
      { id: 'cq3', name: 'Comments explain why, not what', checked: false },
      { id: 'cq4', name: 'No magic numbers', checked: false },
      { id: 'cq5', name: 'Consistent indentation', checked: false },
      { id: 'cq6', name: 'Error handling in place', checked: false },
      { id: 'cq7', name: 'DRY - no code duplication', checked: false },
      { id: 'cq8', name: 'Input validation', checked: false },
    ]
  };
}

/**
 * Default extra data for the Problem Solving tracker.
 * Contains problem log, common mistakes log, and algorithm pattern mastery.
 */
export function getDefaultProblemExtra() {
  return {
    problemLog: [],  // { id, title, difficulty, timeMinutes, approach, result: 'solved'|'partial'|'unsolved', date, notes }
    mistakes: [],    // { id, problem, mistake, lesson, date }

    patterns: [
      { id: 'p1', name: 'Two Pointers', mastered: false },
      { id: 'p2', name: 'Sliding Window', mastered: false },
      { id: 'p3', name: 'Binary Search', mastered: false },
      { id: 'p4', name: 'BFS/DFS', mastered: false },
      { id: 'p5', name: 'Recursion', mastered: false },
      { id: 'p6', name: 'Dynamic Programming', mastered: false },
      { id: 'p7', name: 'Greedy', mastered: false },
      { id: 'p8', name: 'Stack/Queue', mastered: false },
      { id: 'p9', name: 'Hash Map', mastered: false },
      { id: 'p10', name: 'Divide & Conquer', mastered: false },
    ]
  };
}

/**
 * Default extra data for the Board Exam Preparation tracker.
 * Contains subject-chapter checklists, previous year papers, important questions, and mock tests.
 */
export function getDefaultBoardExtra() {
  return {
    subjects: [
      {
        id: 'board-math-ia',
        name: 'Mathematics IA',
        chapters: [
          { id: generateId(), name: 'Functions', completed: false },
          { id: generateId(), name: 'Mathematical Induction', completed: false },
          { id: generateId(), name: 'Matrices', completed: false },
          { id: generateId(), name: 'Complex Numbers', completed: false },
          { id: generateId(), name: 'Quadratic Expressions', completed: false },
          { id: generateId(), name: 'Theory of Equations', completed: false },
          { id: generateId(), name: 'Permutations & Combinations', completed: false },
          { id: generateId(), name: 'Binomial Theorem', completed: false },
          { id: generateId(), name: 'Partial Fractions', completed: false },
        ]
      },
      {
        id: 'board-math-ib',
        name: 'Mathematics IB',
        chapters: [
          { id: generateId(), name: 'Locus', completed: false },
          { id: generateId(), name: 'Transformation of Axes', completed: false },
          { id: generateId(), name: 'Straight Lines', completed: false },
          { id: generateId(), name: 'Pair of Straight Lines', completed: false },
          { id: generateId(), name: 'Circles', completed: false },
          { id: generateId(), name: 'System of Circles', completed: false },
          { id: generateId(), name: 'Parabola', completed: false },
          { id: generateId(), name: 'Ellipse', completed: false },
          { id: generateId(), name: 'Hyperbola', completed: false },
          { id: generateId(), name: 'Limits & Continuity', completed: false },
          { id: generateId(), name: 'Differentiation', completed: false },
          { id: generateId(), name: 'Applications of Derivatives', completed: false },
        ]
      },
      {
        id: 'board-physics',
        name: 'Physics',
        chapters: [
          { id: generateId(), name: 'Physical World', completed: false },
          { id: generateId(), name: 'Units and Measurements', completed: false },
          { id: generateId(), name: 'Motion in a Straight Line', completed: false },
          { id: generateId(), name: 'Motion in a Plane', completed: false },
          { id: generateId(), name: 'Laws of Motion', completed: false },
          { id: generateId(), name: 'Work, Energy and Power', completed: false },
          { id: generateId(), name: 'System of Particles', completed: false },
          { id: generateId(), name: 'Oscillations', completed: false },
          { id: generateId(), name: 'Gravitation', completed: false },
          { id: generateId(), name: 'Mechanical Properties of Solids', completed: false },
          { id: generateId(), name: 'Mechanical Properties of Fluids', completed: false },
          { id: generateId(), name: 'Thermal Properties of Matter', completed: false },
          { id: generateId(), name: 'Thermodynamics', completed: false },
          { id: generateId(), name: 'Kinetic Theory', completed: false },
        ]
      },
      {
        id: 'board-chemistry',
        name: 'Chemistry',
        chapters: [
          { id: generateId(), name: 'Some Basic Concepts of Chemistry', completed: false },
          { id: generateId(), name: 'Structure of Atom', completed: false },
          { id: generateId(), name: 'Classification of Elements', completed: false },
          { id: generateId(), name: 'Chemical Bonding', completed: false },
          { id: generateId(), name: 'States of Matter', completed: false },
          { id: generateId(), name: 'Thermodynamics', completed: false },
          { id: generateId(), name: 'Equilibrium', completed: false },
          { id: generateId(), name: 'Redox Reactions', completed: false },
          { id: generateId(), name: 'Hydrogen', completed: false },
          { id: generateId(), name: 'Organic Chemistry Basics', completed: false },
          { id: generateId(), name: 'Hydrocarbons', completed: false },
          { id: generateId(), name: 'Environmental Chemistry', completed: false },
        ]
      }
    ],

    previousYearPapers: [],  // { id, year, subject, completed: false, score: null }
    importantQuestions: [],   // { id, subject, question, frequency: 'high'|'medium'|'low', answered: false }
    mockTests: [],            // { id, date, subject, score, maxScore, timeMinutes, notes }
  };
}
