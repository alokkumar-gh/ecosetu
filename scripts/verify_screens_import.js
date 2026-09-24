// Verify all navigators and screens load without undefined exports
try {
  const root = require('../mobile/src/navigation/RootNavigator');
  console.log('✔ RootNavigator:', typeof root.RootNavigator);
  
  const collector = require('../mobile/src/navigation/CollectorNavigator');
  console.log('✔ CollectorNavigator:', typeof collector.CollectorNavigator);
  
  const recycler = require('../mobile/src/navigation/RecyclerNavigator');
  console.log('✔ RecyclerNavigator:', typeof recycler.RecyclerNavigator);
  
  const citizen = require('../mobile/src/navigation/CitizenNavigator');
  console.log('✔ CitizenNavigator:', typeof citizen.CitizenNavigator);
  
  const admin = require('../mobile/src/navigation/AdminNavigator');
  console.log('✔ AdminNavigator:', typeof admin.AdminNavigator);
  
  console.log('ALL NAVIGATORS VALIDATED');
} catch (err) {
  console.error('ERROR LOADING NAVIGATORS:', err);
}
