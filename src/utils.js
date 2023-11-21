  /**
   *
   */
  export function weightedRandom(options) {
    var i;
    var weights = [];
  
    for (i = 0; i < options.length; i++)
      weights[i] = options[i].weight + (weights[i - 1] || 0);
  
    var random = Math.random() * weights[weights.length - 1];
  
    for (i = 0; i < weights.length; i++) if (weights[i] > random) break;
  
    return options[i];
  }

  /**
   *
   */
  export function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
    while (currentIndex != 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
  }