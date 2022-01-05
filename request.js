const { request, gql } = require('graphql-request')

const heroQuery = gql`
  query getHero(
    $id: Int
  ) {
    heros(where: { id: $id }) {
      id
      generation
      profession
      statBoost1
      statBoost2
      mainClass
      subClass
      saleAuction {
        startingPrice
        open
      }
      salePrice
      rarity
      summons
    }
  }
`

module.exports.getHero = async (heroId) => {
  const data = await request('https://graph4.defikingdoms.com/subgraphs/name/defikingdoms/apiv5', heroQuery, {id: heroId});
  return data.heros[0];
}
