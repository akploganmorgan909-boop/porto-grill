var MENU = `
@petit-dejeuner|Petit déjeuner|petitdej
#Formules
Formule Complet|4000|1 Nescafé lacté, 1 viennoiserie (croissant, chocolatine ou pain viennois), 1 omelette nature, 1 jus de fruit (gingembre, pastèque ou ananas)
Formule Cappuccino|4000|1 cappuccino du chef, 1 jus de fruit (gingembre, pastèque ou ananas), 1 viennoiserie (croissant, chocolatine ou pain viennois)
Formule Porto-Grill|3500|1 Nescafé lacté, 1 jus de fruit (gingembre, pastèque ou ananas), 1 viennoiserie (croissant, chocolatine ou pain viennois)
@patisserie|Pâtisserie et boulangerie|patisserie
#Viennoiserie
Croissant au beurre doux|600
Chocolatine au beurre|600
Pain raisin|600
Croissant ordinaire|400
#Friands
Feuilletés au fromage|1000
À la viande|800
#Gâteaux
Gâteaux d’anniversaire, à partir de|10000
Cake entier|3000
Part de gâteau|1000
Cake marbré choco vanille|500
Cup cake|200
#Biscuits
Palmier|200
Madeleine cœur choco|100
Madeleine simple|100
#Pains
Baguette française|200
Pain complet|1000|Sur commande
Pain de mie tranché|1000
Brioche spéciale|1000
Brioche|600
Biscotte de croissant|500
Pain grillé|500
Pain viennois|200
@jus|Jus et milk-shakes|jus
#Jus Porto-Grill
Orange nature|1500|Orange pressée
Ananas nature|1000|Jus d’ananas
Pastèque nature|1000|Pastèque pressée
Gingembre nature|1000|Gingembre pressé
Bissap nature|1000|Bissap, ananas
#Jus combi
Hot Ananas|2000|Ananas pressé, citron, orange, gingembre râpé
Natural Fanta|2000|Orange, carotte, ananas, gingembre
Tangerine|2000|Orange, pomme, citron, gingembre
Ananas vert|1500|Ananas, citron vert
Cream|1500|Baobab, lait concentré
Gingembre seasprite|1500|Ananas, gingembre
Magenta|1500|Pastèque, gingembre
#Milk-shakes
Chocolat|2000|Cacao, glace vanille, lait entier
Spéculos|2000|Biscuit spéculos, glace vanille, lait entier
Choco cacahuètes|2000|Glace, chocolat, beurre de cacahuètes, lait entier
Café noisette|2000|Café froid, Nutella, glace vanille, lait
Oréo caramel|2000|Biscuit Oréo, caramel, lait, glace vanille
@boissons|Boissons|boissons
#Boissons chaudes
Cappuccino (capsule)|2000
Expresso (capsule)|2000
Chocolat lacté|2000
Café long intense (capsule)|1500
Chocolat sucré|1500
Thé mojito|1000
Nescafé lacté|1000
Café classique (capsule)|1000
Nescafé sucré|800
Thé chaud (Lipton, citronnelle, menthe)|500
#Sucreries et eaux
Hollandia 1 l|1500
Hollandia 50 ml|700
Coca-Cola, Star citron, Fanta, Sprite, XXL, Moka|600
Fizzi pamplemousse, Whisky cola, Fizzi cocktail, Malta|600
Eau minérale Fifa 1,5 l, Possotomè 1,5 l, Aquabelle|600
Posso citron, Posso gazéifié, Comtesse citron|600
#Bières
Desperados|1800
Rox|1500
Heineken, Doppel, Flag, Pils Togo, Awoyo Togo, Chill, Bullet|1000
Red Bull, Vody, Eku, Guinness, Doppel energy malt|900
Beaufort, Pils, Doppel Lager, Béninoise, Racine (33 cl), Hagbè, Chill (33 cl), Tequila|700
#Bières pression et combi
Bière pression 3 l|6000
Monaco pression 50 cl|3000|Bière pression, sirop de grenadine, Sprite
Tango pression 50 cl|2500|Bière pression, sirop de grenadine
Bière pression 1 l|2000
Bière pression 50 cl|1000
@vins|Vins, champagnes et liqueurs|vins
#Vins et champagnes
Champagne|45000/60000
Mousseux|6000/8000/15000
Vin Porto|8000/9000
Vin rosé|6000/7000/12000
Vin rouge|6000/7000/8000/10000/12000
Vin blanc|7000/9000/10000
#Liqueurs (conso)
Chiva’s|4000
Hennessy|3500
Black label|3000
Campari, Tequila, Red label, Jack Daniels|2000
Cointreau, Clan Taribbeau|2000
Bailey whisky crème, Damoiseau rhum crème, Sam rock whisky cream|2000
Sodabi aux épices (Ayoya), Clan Campbell, Grant’s scotch|1500
Dubonnet, Martini rosso, Ricard, Pastis, Martini blanc|1500
Liqueur de menthe pastille, Suze, Vat 69, JB|1500
@cocktails|Cocktails|cocktails
#Cocktails sans alcool
Chantaco|3000|Jus de citron, jus d’orange, limonade, pamplemousse, sirop de grenadine
Fraîcheur|3000|Jus de pomme, jus d’orange, glaçons, sirop de sucre de canne, sirop de curaçao bleu
Chapman|3000|Jus d’orange, jus de citron, eau gazeuse, sirop de grenadine
Mojito sans alcool|2500|Sirop de canne, eau gazeuse, quartiers de citron, feuille de menthe, jus de pomme
Sunrise|2500|Limonade, sirop de grenadine, jus d’orange
Pastèque mocktail|2500|Pastèque, jus de citron, Sprite, glaçon
Rio|2000|Jus d’orange, limonade, sirop de grenadine, citron vert
Tropic menthe|2000|Jus d’ananas, jus de citron, sirop de menthe
Parisette|2000|Lait frais, sirop de grenadine
#Cocktails alcoolisés
Americano|3000|Campari, martini rouge, eau gazeuse, glaçon
Mojito|3000|Rhum, eau gazeuse, citron, feuille de menthe, sirop de canne
Bob Marley|3000|Sirop de grenadine, glaçons, jus d’orange, vodka, sirop de curaçao bleu
Tropical punch|3000|Glaçon, jus de pomme, jus d’ananas, tequila, sirop de menthe
Gin Fizz|2500|Gin, jus de citron, sirop de canne, eau gazeuse
Piña colada|2500|Rhum blanc, jus d’ananas, lait de coco
Punch|2500|Rhum, sirop de canne, citron
Cocktail Porto Grill|2000|Cocktail surprise du barman
Martini drink|2000|Martini rouge, gin, glaçon
@salades|Salades|salades
#Nos salades
Salade exotique|3000|Laitue, avocat, crevettes, oignon, tomate, thon, maïs doux
Salade du chef|3000|Laitue, concombre, maïs doux, tomate, jambon, oignon
Salade à la béninoise|2500|Laitue, tomate, œuf, oignon, betterave, carotte, spaghetti, viande émincée
Salade composée Porto-Grill|2500|Laitue, petits pois, carotte, blanc de poulet, maïs doux, tomate, oignon
Salade niçoise|2500|Laitue, tomate, thon, œuf, pomme de terre, olive
Salade d’avocat aux crevettes|2500|Laitue, avocat, tomate, oignon, crevettes
Salade de maïs au thon|2000|Laitue, maïs doux, thon, oignon, tomate
Macédoine aux crevettes|2000|Macédoine sautée à l’ail, crevettes
Salade de blanc de poulet|2000|Blanc de poulet, laitue, tomate, oignon
Salade d’avocat|2000|Laitue, avocat, tomate, oignon
Salade de saison|2000|Laitue, tomate, oignon, maïs doux
Salade mixte au thon|2000|Laitue, maïs doux, chou, thon, oignon, tomate
@plats|Poulets et viandes|plats
#Poulets
Kedjenou au poulet épicé|6000|Poulet bicyclette entier, sauce tomate, choux émincés
Bomiwo au poulet|6000|Poulet bicyclette entier, pâte Bomiwo, tomate et oignon émincés
Escalope de poulet normande|5000|Blanc de poulet, crème fraîche, champignons
Poulet émincé aux légumes|4500|Blanc de poulet, légumes sautés
Yassa poulet|4000|Demi-poulet bicyclette, oignon émincé, sauce moutarde
Brochette de poulet|4000|Blanc de poulet en dés à la braise
Demi-poulet braisé|3000|Demi-poulet bicyclette à la braise
#Viandes
Filet de bœuf sauce crème aux champignons|5000|Filet de bœuf sauté, crème fraîche, champignons
Langue de bœuf sauce crème aux champignons|5000|Langue de bœuf, crème fraîche, champignons
Friture d’escargot (dja)|4500|Escargot, friture de tomate
Lapin du chef|4000|Recette du chef à base de lapin
Sauce Blocoto à la fourchette|3500|Patte de bœuf, sauce tomate, fromage peulh
Brochette d’escargot|3500|Escargot à la braise
Brochette de bœuf|3500|Filet de bœuf en dés braisé
Mouton en sauce|3500|Sauce tomate, viande de mouton, fromage
Cassoulet Porto-Grill|3000|Sauce crème, émincé de bœuf, saucisse, poivron, carotte, oignon, chou
Sauce arachide viande|3000|Sauce tomate, pâte d’arachide, viande, fromage peulh
Sauce graine viande|3000|Sauce graine de palme, viande, fromage peulh
Gbekoui tchiayo viande|3000|Légume feuille tchiayo, goussi, viande, fromage peulh
Caille braisée|2000
@poissons|Poissons et crevettes|poissons
#Poissons et crevettes
Brochette de gambas|8000
Gambas sautées à l’ail|8000
Poisson carpe braisé|8000/5000/4000|Carpe à la braise
Poisson bar braisé|8000/5000/4000|Vrai bar à la braise
Filet de poisson à la basquaise|5000|Sauce tomate, poivron, oignon, vin blanc, filet de poisson
Filet de poisson sauce crème|5000|Filet de poisson sauté, crème fraîche
Poisson tilapia frais en sauce|5000/4000
Brochette de filet de poisson|4500|Filet de poisson en dés à la braise
Sauce arachide au poisson|3000|Sauce tomate, pâte d’arachide, poisson, fromage peulh
Sauce graine poisson|3000|Sauce graine de palme, poisson, fromage peulh
Gbekoui tchiayo au poisson|3000|Légume feuille tchiayo, goussi, fromage peulh, poisson
Assrokouin|3000|Poisson, crabe, fromage peulh, peau de vache
#Accompagnements
Au choix||Télibo, akassa, attiéké, riz nature, moyo, alloco, agbeli, couscous, riz gras, riz créole, riz au curry, dakouin, macédoine de légumes, pommes frites, pâte de maïs, amiwo, piron rouge, pommes sautées, haricots verts sautés
@grillades|Grillades sur plateau|grillades
#Grill-combi
Classique maxi|15000|Lapin, bœuf, poulet, mouton + 3 accompagnements
Classique|8000|Lapin, bœuf, poulet + 2 accompagnements
Parakois|4500|Poulet, pintade + 1 accompagnement
Mouton mix|4500|Mouton, bœuf + 1 accompagnement
#Accompagnements
Au choix||Riz, riz créole, riz gras, alloco, pommes frites, pommes sautées, couscous, attiéké, akassa
@burgers|Burgers|burgers
#Viande
Double Cheese Burger|5000|Double viande, laitue, vinaigrette, tomate, oignon, cheddar
Double Burger|4500|Double viande, laitue, vinaigrette, tomate, oignon
Cheese Burger|4500|Viande, laitue, vinaigrette, tomate, oignon, cheddar
Hamburger simple|4000|Viande, laitue, vinaigrette, tomate, oignon
#Poulet
Double Chicken Cheese Burger|6000|Double blanc de poulet, laitue, vinaigrette, cheddar, tomate, oignon, fromage
Chicken Cheese Burger|5000|Blanc de poulet, laitue, vinaigrette, cheddar, tomate, oignon, fromage
Double Chicken Burger|5000|Double blanc de poulet, laitue, vinaigrette, tomate, oignon
Chicken Burger|4500|Blanc de poulet, laitue, vinaigrette, tomate, oignon
#Poisson
Double Cheese Fish Burger|7000|Double filet de poisson, laitue, vinaigrette, cheddar, tomate, oignon, fromage
Cheese Fish Burger|6000|Filet de poisson, laitue, vinaigrette, cheddar, tomate, oignon, fromage
Double Fish Burger|6000|Double filet de poisson, laitue, vinaigrette, cheddar, tomate, oignon, fromage
Fish Burger|5500|Filet de poisson, laitue, vinaigrette, cheddar, tomate, oignon, fromage
#Spécial
Special Burger Porto Grill|6000|Blanc de poulet, filet de bœuf, sauce burger, tomate, laitue, mozzarella, oignon
@pizzas|Pizzas|pizzas
#Pizzas classiques (deux prix)
Pizza 4 fromages|8000/9000|Sauce tomate, cocktail 4 fromages, olives, champignons
Pizza merguez|5000/7000|Sauce tomate, viande hachée, merguez, olive, fromage
Pizza sicilienne|4000/6000|Sauce tomate, poivron, thon, fromage, basilic
Pizza mexicaine|4000/6000|Sauce tomate, viande hachée, poivron, oignon, maïs doux, fromage
Pizza aux fruits de mer|5000/7000|Tomate, fromage, cocktail de fruits de mer, olives, champignons
Pizza végétarienne|4000/6000|Sauce tomate, thon, tomate, poivron, olives, champignons, maïs doux
Pizza napolitaine|5000/7000|Sauce tomate, thon, fromage, oignon, ail
Pizza viande|4000/6000|Sauce tomate, viande hachée, olives, fromage
Royale|4000/6000|Tomate, fromage, jambon, champignons, olives
Chicken|4000/6000|Tomate, fromage, poulet, champignons, oignon
#Pizzas crème fraîche (deux prix)
Torino|5000/7000|Sauce crème fraîche, champignons, blanc de poulet
Vénezia|5000/7000|Sauce crème fraîche, fromage, pomme de terre, jambon
Milano|5000/7000|Sauce crème fraîche, fromage, viande hachée, pomme de terre, poivron
Vivaldi|6000/8000|Sauce crème fraîche, fromage, viande hachée, blanc de poulet
@sandwichs|Sandwichs|sandwichs
#Sandwichs
Chawarma poisson|3500|Filet de poisson, sauce, laitue, tomate, oignon, frites
Chawarma merguez|3000|Merguez, sauce, laitue, tomate, oignon, frites
Chawarma poulet|2500|Blanc de poulet, sauce, laitue, tomate, oignon, frites
Sandwich d’avocat au thon|2500|Thon, tomate, oignon, avocat, sauce
Chawarma à la viande de bœuf|2000|Filet de bœuf, sauce, laitue, tomate, oignon, frites
Sandwich au jambon|2000|Laitue, tomate, jambon, cheddar, mayonnaise
Sandwich viande hachée|2000|Viande hachée, carotte, poivron, pomme de terre
Panini|2000|Pain viennois, viande hachée, jambon, mozzarella, carotte
Sandwich poulet avocat|2000|Blanc de poulet, avocat, tomate, mayonnaise
Sandwich végétal au poulet|2000|Blanc de poulet, mayonnaise, laitue, tomate
Club sandwich poulet poisson|2000|Blanc de poulet, mayonnaise, laitue, tomate, poisson, oignon, crème épaisse
Végétarien|1500|Carotte, chou blanc, laitue
@pates|Pâtes|pates
#Pâtes
Tagliatelles aux fruits de mer|6000|Tagliatelles, poisson, crevettes, champignons, ail, crème fraîche
Pâtes Alfredo aux crevettes|5000|Spaghettis, blanc de poulet, champignons, poivron, sauce crème, crevettes
Pâtes à la viande hachée et crevettes|4000|Spaghettis, viande hachée, sauce tomate, crevettes
Spaghettis bolognaise|3000|Spaghettis, tomate, oignon, ail, basilic, viande hachée
Coquillettes au lait de coco|2500|Coquillettes, lait de coco, poivrons, carotte, oignon, haricots verts, émincé de viande
Spaghettis blanc crémé|2500|Spaghettis, oignon, ail, poivrons, carotte, haricots verts, émincé de viande
Pennes arrabiata|1500|Pennes, basilic, sauce tomate relevée, omelette
Spaghettis cafète|1500|Spaghettis, sauce tomate, omelette
@desserts|Desserts|desserts
#Produits laitiers et fruits
Verrine de yaourt composée|2500
Dèguè sucré vanille|1200
Lait caillé|1000
#Crêpes
Crêpe salée viande hachée|2000|Viande hachée, poivron, oignon, fromage
Crêpe salée au jambon|2000|Jambon, poivron, oignon, fromage
Crêpe sucrée Nutella|1500
Crêpe sucrée vanille|1000
#Glaces
Vanille, menthe, fraise, framboise, spéculos, cookies, coco, café, chocolat, gingembre, cassis, miel, biscoto|1000
`;
