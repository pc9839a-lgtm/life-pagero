import vm from 'node:vm';

// The interactive food picker owns the 12-month list and authored recipe
// steps. The static SEO/first-paint markup must use that SAME catalogue, not
// hard-code November and contradict the selected current KST month.
export function seoulMonth(date = new Date()) {
  const month = Number(new Intl.DateTimeFormat('en-US',{
    timeZone:'Asia/Seoul', month:'numeric'
  }).format(date));
  if(!Number.isInteger(month)||month<1||month>12)
    throw Error('[food-initial] Could not determine Seoul calendar month');
  return month;
}

export function monthlyInitialRows(script, month) {
  if(!Number.isInteger(month)||month<1||month>12)
    throw Error('[food-initial] Month must be 1 through 12');
  const monthsSource=String(script).match(/const monthly=(\{[\s\S]*?\n\});/);
  const recipesSource=String(script).match(/const recipeRows=(\[[^\r\n]+\]);/);
  if(!monthsSource||!recipesSource)
    throw Error('[food-initial] Interactive month/recipe source was changed');
  // Evaluate only the author's self-contained object literal in a restricted,
  // short-lived context. The full UI script is NOT executed in the builder.
  const all=vm.runInNewContext('('+monthsSource[1]+')',
    Object.create(null),{timeout:200});
  const recipeRows=JSON.parse(recipesSource[1]);
  const byMeal=new Map(recipeRows.map(([name,,steps])=>[name,steps]));
  if(Object.keys(all).length!==12 || recipeRows.length<36)
    throw Error('[food-initial] Season/recipe catalogue incomplete');
  const sourceRows=all[month];
  if(!Array.isArray(sourceRows)||sourceRows.length<3||sourceRows.length>12)
    throw Error('[food-initial] Month has no verified menu options: '+month);
  // Convert sandbox-backed data into native Node arrays for deterministic builds.
  return Array.from(sourceRows,([name,recipe,keep,query])=>{
    const steps=byMeal.get(recipe);
    if(![name,recipe,keep,query].every(v=>typeof v==='string'&&v.trim().length>0)
        ||query.trim().length<2||query.length>40
        ||!Array.isArray(steps)||steps.length<2)
      throw Error('[food-initial] Monthly food item lacks an authored recipe');
    return {name,kind:'제철 식재료',recipe,method:steps.join(' '),keep,query};
  });
}
